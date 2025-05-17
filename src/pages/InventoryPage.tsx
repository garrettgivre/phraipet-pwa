// src/pages/InventoryPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInventory, imageCache } from "../contexts/InventoryContext";
import type {
  InventoryItem,
  DecorationInventoryItem,
  FoodInventoryItem,
  GroomingInventoryItem,
  ToyInventoryItem,
  FoodCategory,
  GroomingCategory, // This type is now restricted to the 5 main ones
  ToyCategory,
  Pet as PetType,
  DecorationItemType,
  RoomDecorItem,
} from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import "./InventoryPage.css";

const mainCategories = ["Decorations", "Food", "Grooming", "Toys"] as const;
type MainCategory = (typeof mainCategories)[number];

const decorationSubCategories = [
  "wall",
  "floor",
  "ceiling",
  "trim",
  "decor",
  "overlay",
];
const foodSubCategories: FoodCategory[] = [
  "Treat", "Snack", "LightMeal", "HeartyMeal", "Feast",
];
// MODIFIED: groomingSubCategories now only contains the 5 main types
const groomingSubCategories: GroomingCategory[] = [
  "QuickFix", "BasicKit", "StandardSet", "PremiumCare", "LuxurySpa",
];
const toySubCategories: ToyCategory[] = [
  "Basic", "Classic", "Plushie", "Gadget", "Wonder",
];

interface InventoryLocationState {
  targetMainCategory?: MainCategory;
  targetSubCategory?: string;
}

interface InventoryPageProps {
  pet: PetType | null;
  onFeedPet: (foodItem: FoodInventoryItem) => void;
  onGroomPet: (groomingItem: GroomingInventoryItem) => void;
  onPlayWithToy: (toyItem: ToyInventoryItem) => void;
}

const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  const specialCases: Record<string, string> = {
    backDecor: "Back Decor", frontDecor: "Front Decor", QuickFix: "Quick Fix",
    BasicKit: "Basic Kit", StandardSet: "Standard Set", PremiumCare: "Premium Care",
    LuxurySpa: "Luxury Spa", LightMeal: "Light Meal", HeartyMeal: "Hearty Meal",
  };
  if (specialCases[string]) return specialCases[string];
  // Generic capitalization for single words or rely on direct enum value if it's already capitalized
  return string.charAt(0).toUpperCase() + string.slice(1).replace(/([A-Z])/g, ' $1').trim();
};

function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const containerSize = 64;
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({
    visibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '12px', color: '#aaa',
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoaded(false);
    setError(false);
    setImageStyle(prev => ({ ...prev, visibility: 'hidden' }));

    // Check if image is already in cache
    if (imageCache.has(src)) {
      const cachedImg = imageCache.get(src)!;
      if (cachedImg.complete) {
        if (!isMounted) return;
        calculateVisibleBounds(src).then(bounds => {
          if (!isMounted) return;
          if (bounds.width <= 0 || bounds.height <= 0 || bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
            setError(true);
            setLoaded(true);
            setImageStyle({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${containerSize}px`,
              height: `${containerSize}px`,
              fontSize: '20px',
              color: 'red',
              border: '1px solid #ddd',
              boxSizing: 'border-box',
              visibility: 'visible'
            });
            return;
          }
          const scale = Math.min(containerSize / bounds.width, containerSize / bounds.height);
          const scaledNaturalWidth = bounds.naturalWidth * scale;
          const scaledNaturalHeight = bounds.naturalHeight * scale;
          const offsetX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale);
          const offsetY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);
          setImageStyle({
            position: "absolute",
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            width: `${scaledNaturalWidth}px`,
            height: `${scaledNaturalHeight}px`,
            visibility: 'visible'
          });
          setLoaded(true);
        }).catch((err) => {
          if (!isMounted) return;
          console.error("Error in calculateVisibleBounds for src:", src, err);
          setError(true);
          setLoaded(true);
          setImageStyle({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${containerSize}px`,
            height: `${containerSize}px`,
            fontSize: '20px',
            color: 'red',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            visibility: 'visible'
          });
        });
      }
    } else {
      const img = new Image();
      img.src = src;
      img.crossOrigin = "anonymous";
      imageCache.set(src, img);

      img.onload = () => {
        if (!isMounted) return;
        calculateVisibleBounds(src).then(bounds => {
          if (!isMounted) return;
          if (bounds.width <= 0 || bounds.height <= 0 || bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
            setError(true);
            setLoaded(true);
            setImageStyle({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${containerSize}px`,
              height: `${containerSize}px`,
              fontSize: '20px',
              color: 'red',
              border: '1px solid #ddd',
              boxSizing: 'border-box',
              visibility: 'visible'
            });
            return;
          }
          const scale = Math.min(containerSize / bounds.width, containerSize / bounds.height);
          const scaledNaturalWidth = bounds.naturalWidth * scale;
          const scaledNaturalHeight = bounds.naturalHeight * scale;
          const offsetX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale);
          const offsetY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);
          setImageStyle({
            position: "absolute",
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            width: `${scaledNaturalWidth}px`,
            height: `${scaledNaturalHeight}px`,
            visibility: 'visible'
          });
          setLoaded(true);
        }).catch((err) => {
          if (!isMounted) return;
          console.error("Error in calculateVisibleBounds for src:", src, err);
          setError(true);
          setLoaded(true);
          setImageStyle({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${containerSize}px`,
            height: `${containerSize}px`,
            fontSize: '20px',
            color: 'red',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            visibility: 'visible'
          });
        });
      };

      img.onerror = () => {
        if (!isMounted) return;
        console.error("Failed to load image for ZoomedImage:", src);
        setError(true);
        setLoaded(true);
        setImageStyle({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          fontSize: '20px',
          color: 'red',
          border: '1px solid #ddd',
          boxSizing: 'border-box',
          visibility: 'visible'
        });
      };
    }

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

export default function InventoryPage({ pet, onFeedPet, onGroomPet, onPlayWithToy }: InventoryPageProps) {
  const { setRoomLayer, addDecorItem, consumeItem, getFilteredItems } = useInventory();
  const location = useLocation();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const initialTabs = useMemo(() => {
    const state = location.state as InventoryLocationState | null;
    let main: MainCategory = "Decorations";
    let sub: string = decorationSubCategories[0]; // Default
    if (state?.targetMainCategory) {
      main = state.targetMainCategory;
      if (main === "Decorations") sub = (decorationSubCategories.includes(state.targetSubCategory as DecorationItemType) ? state.targetSubCategory : decorationSubCategories[0]) as string;
      else if (main === "Food") sub = (foodSubCategories.includes(state.targetSubCategory as FoodCategory) ? state.targetSubCategory : foodSubCategories[0]) as string;
      else if (main === "Grooming") sub = (groomingSubCategories.includes(state.targetSubCategory as GroomingCategory) ? state.targetSubCategory : groomingSubCategories[0]) as string;
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
    setIsTransitioning(true);
    setSelectedMainCategory(category);
    if (category === "Decorations") setSelectedSubCategory(decorationSubCategories[0]);
    else if (category === "Food") setSelectedSubCategory(foodSubCategories[0]);
    else if (category === "Grooming") setSelectedSubCategory(groomingSubCategories[0]);
    else if (category === "Toys") setSelectedSubCategory(toySubCategories[0]);
    setActiveColorOptions(null);
    // Use requestAnimationFrame to ensure state updates are processed before removing transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    });
  }, []);

  const handleSubCategoryChange = useCallback((category: string) => {
    setIsTransitioning(true);
    setSelectedSubCategory(category);
    // Use requestAnimationFrame to ensure state updates are processed before removing transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    });
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
    } else if (selectedMainCategory === "Grooming") {
      currentSubIsValid = groomingSubCategories.includes(selectedSubCategory as GroomingCategory);
      if (!currentSubIsValid) setSelectedSubCategory(groomingSubCategories[0]);
    } else if (selectedMainCategory === "Toys") {
      currentSubIsValid = toySubCategories.includes(selectedSubCategory as ToyCategory);
      if (!currentSubIsValid) setSelectedSubCategory(toySubCategories[0]);
    }
  }, [selectedMainCategory, selectedSubCategory]);

  const applyDecorationItem = useCallback((item: DecorationInventoryItem, chosenSrc?: string) => {
    const srcToApply = chosenSrc || item.src;
    if (["floor", "wall", "ceiling", "overlay", "trim"].includes(item.type)) {
      setRoomLayer(item.type as "floor" | "wall" | "ceiling" | "trim" | "overlay", srcToApply);
    } else if (item.type === "decor") {
      const decorItem: RoomDecorItem = { src: srcToApply, x: 100, y: 100 };
      addDecorItem("decor", decorItem);
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
    } else if (item.itemCategory === "grooming") {
      if (pet) { onGroomPet(item as GroomingInventoryItem); consumeItem(item.id); }
      else console.warn("Pet data not loaded! Cannot groom.");
    } else if (item.itemCategory === "toy") {
      if (pet) { onPlayWithToy(item as ToyInventoryItem); consumeItem(item.id); }
      else console.warn("Pet data not loaded! Cannot play.");
    }
  }, [pet, onFeedPet, onGroomPet, onPlayWithToy, consumeItem, applyDecorationItem, activeColorOptions]);

  const filteredItems = useMemo(() => 
    getFilteredItems(selectedMainCategory, selectedSubCategory),
    [getFilteredItems, selectedMainCategory, selectedSubCategory]
  );

  const currentSubcategories = useMemo(() => {
    if (selectedMainCategory === "Decorations") return decorationSubCategories;
    if (selectedMainCategory === "Food") return foodSubCategories;
    if (selectedMainCategory === "Grooming") return groomingSubCategories;
    if (selectedMainCategory === "Toys") return toySubCategories;
    return [];
  }, [selectedMainCategory]);

  return (
    <div className="sq-inventory-page-wrapper">
      <h1 className="sq-inventory-title-bar">Inventory</h1>
      <div className="sq-inventory-item-display-area">
        <div className={`sq-inventory-item-grid ${isTransitioning ? 'transitioning' : ''}`}>
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
                  {item.itemCategory === "grooming" && <span className="sq-inventory-item-effect-text">Clean +{(item as GroomingInventoryItem).cleanlinessBoost}</span>}
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
              onClick={() => handleSubCategoryChange(categoryValue)}
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
