// src/pages/InventoryPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import type {
  InventoryItem,
  DecorationInventoryItem,
  FoodInventoryItem,
  CleaningInventoryItem,
  ToyInventoryItem,
  FoodCategory,
  CleaningCategory,
  ToyCategory,
  Pet as PetType,
  DecorationItemType,
  RoomDecorItem,
} from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import "./InventoryPage.css"; // This will be the CSS for the square tabs

// --- Constants for categories ---
const mainCategories = ["Decorations", "Food", "Cleaning", "Toys"] as const;
type MainCategory = (typeof mainCategories)[number];

const decorationSubCategories: DecorationItemType[] = [
  "wall", "floor", "ceiling", "backDecor", "frontDecor", "overlay",
];
const foodSubCategories: FoodCategory[] = [
  "Treat", "Snack", "LightMeal", "HeartyMeal", "Feast",
];
const cleaningSubCategories: CleaningCategory[] = [
  "QuickFix", "BasicKit", "StandardSet", "PremiumCare", "LuxurySpa",
];
const toySubCategories: ToyCategory[] = [
  "ChewToy", "Plushie", "PuzzleToy", "ActivityCenter", "RoboticPal",
];

interface InventoryLocationState {
  targetMainCategory?: MainCategory;
  targetSubCategory?: string;
}

interface InventoryPageProps {
  pet: PetType | null;
  onFeedPet: (foodItem: FoodInventoryItem) => void;
  onCleanPet: (cleaningItem: CleaningInventoryItem) => void;
  onPlayWithToy: (toyItem: ToyInventoryItem) => void;
}

const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  const specialCases: Record<string, string> = {
    backDecor: "Back Decor", frontDecor: "Front Decor", QuickFix: "Quick Fix",
    BasicKit: "Basic Kit", StandardSet: "Standard Set", PremiumCare: "Premium Care",
    LuxurySpa: "Luxury Spa", ChewToy: "Chew Toy", PuzzleToy: "Puzzle Toy",
    ActivityCenter: "Activity Center", RoboticPal: "Robotic Pal", LightMeal: "Light Meal",
    HeartyMeal: "Hearty Meal",
  };
  if (specialCases[string]) return specialCases[string];
  return string.charAt(0).toUpperCase() + string.slice(1);
};

function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const containerSize = 64; // This should match the CSS for .sq-inventory-item-image-wrapper
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({
    visibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '12px', color: '#aaa',
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoaded(false); setError(false);
    setImageStyle(prev => ({ ...prev, visibility: 'hidden' }));

    const img = new Image();
    img.src = src;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (!isMounted) return;
      calculateVisibleBounds(src).then(bounds => {
        if (!isMounted) return;
        if (bounds.width <= 0 || bounds.height <= 0 || bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
          setError(true); setLoaded(true);
          setImageStyle({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box', visibility: 'visible' });
          return;
        }
        const scale = Math.min(containerSize / bounds.width, containerSize / bounds.height);
        const scaledNaturalWidth = bounds.naturalWidth * scale;
        const scaledNaturalHeight = bounds.naturalHeight * scale;
        const offsetX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale);
        const offsetY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);
        setImageStyle({ position: "absolute", left: `${offsetX}px`, top: `${offsetY}px`, width: `${scaledNaturalWidth}px`, height: `${scaledNaturalHeight}px`, visibility: 'visible' });
        setLoaded(true);
      }).catch((err) => {
        if (!isMounted) return;
        console.error("Error in calculateVisibleBounds for src:", src, err);
        setError(true); setLoaded(true);
        setImageStyle({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box', visibility: 'visible' });
      });
    };
    img.onerror = () => {
      if (!isMounted) return;
      console.error("Failed to load image for ZoomedImage:", src);
      setError(true); setLoaded(true);
      setImageStyle({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box', visibility: 'visible' });
    };
    return () => { isMounted = false; };
  }, [src]);

  return (
    <div className="sq-inventory-item-image-wrapper">
      {!loaded && <div className="sq-inventory-item-placeholder-text">...</div>}
      {loaded && error && <div className="sq-inventory-item-placeholder-text error" style={imageStyle} title={`Error: ${alt}`}>X</div>}
      {loaded && !error && (
        <img src={src} alt={alt} className="sq-inventory-item-image-content" style={imageStyle} />
      )}
    </div>
  );
}

export default function InventoryPage({ pet, onFeedPet, onCleanPet, onPlayWithToy }: InventoryPageProps) {
  const { items, setRoomLayer, addDecorItem, consumeItem } = useInventory();
  const location = useLocation();
  const navigate = useNavigate();

  const initialTabs = useMemo(() => {
    const state = location.state as InventoryLocationState | null;
    let main: MainCategory = "Decorations";
    let sub: string = decorationSubCategories[0];
    if (state?.targetMainCategory) {
      main = state.targetMainCategory;
      if (main === "Decorations") sub = (decorationSubCategories.includes(state.targetSubCategory as DecorationItemType) ? state.targetSubCategory : decorationSubCategories[0]) as string;
      else if (main === "Food") sub = (foodSubCategories.includes(state.targetSubCategory as FoodCategory) ? state.targetSubCategory : foodSubCategories[0]) as string;
      else if (main === "Cleaning") sub = (cleaningSubCategories.includes(state.targetSubCategory as CleaningCategory) ? state.targetSubCategory : cleaningSubCategories[0]) as string;
      else if (main === "Toys") sub = (toySubCategories.includes(state.targetSubCategory as ToyCategory) ? state.targetSubCategory : toySubCategories[0]) as string;
    }
    return { main, sub };
  }, [location.state]);

  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>(initialTabs.main);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialTabs.sub);
  const [activeColorOptions, setActiveColorOptions] = useState<{ id: string; options: { label: string; src: string }[] } | null>(null);

  useEffect(() => {
    if (location.state && (location.state as InventoryLocationState).targetMainCategory) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleMainCategoryChange = useCallback((category: MainCategory) => {
    setSelectedMainCategory(category);
    if (category === "Decorations") setSelectedSubCategory(decorationSubCategories[0]);
    else if (category === "Food") setSelectedSubCategory(foodSubCategories[0]);
    else if (category === "Cleaning") setSelectedSubCategory(cleaningSubCategories[0]);
    else if (category === "Toys") setSelectedSubCategory(toySubCategories[0]);
    setActiveColorOptions(null);
  }, []);

  useEffect(() => {
    setActiveColorOptions(null);
    let currentSubIsValid = false;
    if (selectedMainCategory === "Decorations") {
      currentSubIsValid = decorationSubCategories.includes(selectedSubCategory as DecorationItemType);
      if (!currentSubIsValid) setSelectedSubCategory(decorationSubCategories[0]);
    } else if (selectedMainCategory === "Food") {
      currentSubIsValid = foodSubCategories.includes(selectedSubCategory as FoodCategory);
      if (!currentSubIsValid) setSelectedSubCategory(foodSubCategories[0]);
    } else if (selectedMainCategory === "Cleaning") {
      currentSubIsValid = cleaningSubCategories.includes(selectedSubCategory as CleaningCategory);
      if (!currentSubIsValid) setSelectedSubCategory(cleaningSubCategories[0]);
    } else if (selectedMainCategory === "Toys") {
      currentSubIsValid = toySubCategories.includes(selectedSubCategory as ToyCategory);
      if (!currentSubIsValid) setSelectedSubCategory(toySubCategories[0]);
    }
  }, [selectedMainCategory, selectedSubCategory]);

  const applyDecorationItem = useCallback((item: DecorationInventoryItem, chosenSrc?: string) => {
    const srcToApply = chosenSrc || item.src;
    if (["floor", "wall", "ceiling", "overlay"].includes(item.type)) {
      setRoomLayer(item.type as "floor" | "wall" | "ceiling" | "overlay", srcToApply);
    } else if (item.type === "backDecor" || item.type === "frontDecor") {
      const decorItem: RoomDecorItem = { src: srcToApply, x: 100, y: 100 }; // Example coords
      addDecorItem(item.type, decorItem);
    }
    setActiveColorOptions(null);
  }, [setRoomLayer, addDecorItem]);

  const handleItemClick = useCallback((item: InventoryItem) => {
    if (item.itemCategory === "decoration") {
      const decorationItem = item as DecorationInventoryItem;
      if (decorationItem.colorOptions && decorationItem.colorOptions.length > 0) {
        setActiveColorOptions(prev => (prev?.id === item.id ? null : { id: item.id, options: decorationItem.colorOptions! }));
      } else {
        applyDecorationItem(decorationItem);
      }
    } else if (item.itemCategory === "food") {
      if (pet) { onFeedPet(item as FoodInventoryItem); consumeItem(item.id); }
      else console.warn("Pet data not loaded! Cannot feed.");
    } else if (item.itemCategory === "cleaning") {
      if (pet) { onCleanPet(item as CleaningInventoryItem); consumeItem(item.id); }
      else console.warn("Pet data not loaded! Cannot clean.");
    } else if (item.itemCategory === "toy") {
      if (pet) { onPlayWithToy(item as ToyInventoryItem); consumeItem(item.id); }
      else console.warn("Pet data not loaded! Cannot play.");
    }
  }, [pet, onFeedPet, onCleanPet, onPlayWithToy, consumeItem, applyDecorationItem, activeColorOptions]);

  const filteredItems = useMemo(() => items.filter(item => {
    if (selectedMainCategory === "Decorations") return item.itemCategory === "decoration" && (item as DecorationInventoryItem).type === selectedSubCategory;
    if (selectedMainCategory === "Food") return item.itemCategory === "food" && (item as FoodInventoryItem).type === selectedSubCategory;
    if (selectedMainCategory === "Cleaning") return item.itemCategory === "cleaning" && (item as CleaningInventoryItem).type === selectedSubCategory;
    if (selectedMainCategory === "Toys") return item.itemCategory === "toy" && (item as ToyInventoryItem).type === selectedSubCategory;
    return false;
  }), [items, selectedMainCategory, selectedSubCategory]);

  const currentSubcategories = useMemo(() => {
    if (selectedMainCategory === "Decorations") return decorationSubCategories;
    if (selectedMainCategory === "Food") return foodSubCategories;
    if (selectedMainCategory === "Cleaning") return cleaningSubCategories;
    if (selectedMainCategory === "Toys") return toySubCategories;
    return [];
  }, [selectedMainCategory]);

  return (
    <div className="sq-inventory-page-wrapper">
      <h1 className="sq-inventory-title-bar">Inventory</h1>

      <div className="sq-inventory-item-display-area">
        <div className="sq-inventory-item-grid">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="sq-inventory-item-slot"
                onClick={() => handleItemClick(item)}
                title={item.description || item.name}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(item);}}}
              >
                <ZoomedImage src={item.src} alt={item.name} />
                <div className="sq-inventory-item-info">
                  <span className="sq-inventory-item-name-text">{item.name}</span>
                  {item.itemCategory === "food" && <span className="sq-inventory-item-effect-text">Hunger +{(item as FoodInventoryItem).hungerRestored}</span>}
                  {item.itemCategory === "cleaning" && <span className="sq-inventory-item-effect-text">Clean +{(item as CleaningInventoryItem).cleanlinessBoost}</span>}
                  {item.itemCategory === "toy" && <span className="sq-inventory-item-effect-text">Happy +{(item as ToyInventoryItem).happinessBoost}</span>}
                </div>
                {activeColorOptions?.id === item.id && item.itemCategory === "decoration" && (item as DecorationInventoryItem).colorOptions && (
                  <div className="sq-inventory-item-color-picker">
                    {(item as DecorationInventoryItem).colorOptions!.map(option => (
                      <button
                        key={option.label}
                        className="sq-inventory-color-option-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyDecorationItem(item as DecorationInventoryItem, option.src);
                        }}
                        style={{ backgroundImage: `url(${option.src})` }}
                        title={option.label}
                        aria-label={`Select color: ${option.label}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="sq-inventory-empty-message">No items in this category.</p>
          )}
        </div>
      </div>

      <div className="sq-inventory-navigation-bars">
        <div className="sq-inventory-sub-category-bar">
          {currentSubcategories.map(categoryValue => (
            <button
              key={categoryValue}
              className={`sq-inventory-tab-button ${selectedSubCategory === categoryValue ? "active" : ""}`}
              onClick={() => setSelectedSubCategory(categoryValue)}
            >
              {capitalizeFirstLetter(categoryValue)}
            </button>
          ))}
        </div>
        <div className="sq-inventory-main-category-bar">
          {mainCategories.map(category => (
            <button
              key={category}
              className={`sq-inventory-main-tab-button ${selectedMainCategory === category ? "active" : ""}`}
              onClick={() => handleMainCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
