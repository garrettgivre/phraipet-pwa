// src/pages/InventoryPage.tsx
import React, { useEffect, useState, useMemo } from "react";
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
    DecorationItemType 
} from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import "./InventoryPage.css";

// Define main categories
const mainCategories = ["Decorations", "Food", "Cleaning", "Toys"] as const;
type MainCategory = typeof mainCategories[number];

// Define sub-categories for Decorations using the actual DecorationItemType values
const decorationSubCategories: DecorationItemType[] = ["wall", "floor", "ceiling", "backDecor", "frontDecor", "overlay"];

// Define sub-categories for Food
const foodSubCategories: FoodCategory[] = ["Treat", "Snack", "LightMeal", "HeartyMeal", "Feast"];

// Define sub-categories for Cleaning
const cleaningSubCategories: CleaningCategory[] = ["QuickFix", "BasicKit", "StandardSet", "PremiumCare", "LuxurySpa"];

// Define sub-categories for Toys
const toySubCategories: ToyCategory[] = ["ChewToy", "Plushie", "PuzzleToy", "ActivityCenter", "RoboticPal"];

// Interface for the state passed via react-router-dom's navigate function
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

// Helper to capitalize first letter for display
const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  // Specific handling for multi-word or special-case internal names
  if (string === "backDecor") return "Back Decor";
  if (string === "frontDecor") return "Front Decor";
  if (string === "QuickFix") return "Quick Fix";
  if (string === "BasicKit") return "Basic Kit";
  if (string === "StandardSet") return "Standard Set";
  if (string === "PremiumCare") return "Premium Care";
  if (string === "LuxurySpa") return "Luxury Spa";
  if (string === "ChewToy") return "Chew Toy";
  if (string === "PuzzleToy") return "Puzzle Toy";
  if (string === "ActivityCenter") return "Activity Center";
  if (string === "RoboticPal") return "Robotic Pal";
  if (string === "LightMeal") return "Light Meal";
  if (string === "HeartyMeal") return "Hearty Meal";
  // Default capitalization for single words
  return string.charAt(0).toUpperCase() + string.slice(1);
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
    setLoaded(false); setError(false); setImageStyle(prev => ({ ...prev, visibility: 'hidden' }));
    const img = new Image(); img.src = src; img.crossOrigin = "anonymous";
    img.onload = () => {
      calculateVisibleBounds(src).then(bounds => {
        if (bounds.width <= 0 || bounds.height <= 0 || bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
          setError(true); setLoaded(true); setImageStyle({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box', visibility: 'visible', }); return;
        }
        const scale = Math.min(containerSize / bounds.width, containerSize / bounds.height);
        const scaledNaturalWidth = bounds.naturalWidth * scale; const scaledNaturalHeight = bounds.naturalHeight * scale;
        const offsetX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale); const offsetY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);
        setImageStyle({ position: "absolute", left: `${offsetX}px`, top: `${offsetY}px`, width: `${scaledNaturalWidth}px`, height: `${scaledNaturalHeight}px`, visibility: 'visible', });
        setLoaded(true);
      }).catch((err) => { console.error("Error in calculateVisibleBounds for src:", src, err); setError(true); setLoaded(true); setImageStyle({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box', visibility: 'visible', }); });
    };
    img.onerror = () => { console.error("Failed to load image for ZoomedImage:", src); setError(true); setLoaded(true); setImageStyle({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${containerSize}px`, height: `${containerSize}px`, fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box', visibility: 'visible', }); };
  }, [src]); // Dependency: src

  return ( 
    <div className="zoom-container"> 
      {!loaded && <div className="zoom-placeholder" style={{fontSize: '12px', color: '#aaa'}}>...</div>} 
      {loaded && error && <div className="zoom-placeholder" style={imageStyle} title={`Error: ${alt}`}>X</div>} 
      {loaded && !error && ( <img src={src} alt={alt} className="inventory-image" style={imageStyle} /> )} 
    </div> 
  );
}

export default function InventoryPage({ pet, onFeedPet, onCleanPet, onPlayWithToy }: InventoryPageProps) {
  const { items, setRoomLayer, addDecorItem, consumeItem } = useInventory();
  const location = useLocation();
  const navigate = useNavigate();

  // Calculate initial tabs based on location state, memoized for stability.
  const initialTabs = useMemo(() => {
    const state = location.state as InventoryLocationState | null;
    let main: MainCategory = "Decorations"; // Default main category
    let sub: string = decorationSubCategories[0]; // Default sub-category for Decorations

    if (state?.targetMainCategory) {
      main = state.targetMainCategory;
      if (main === "Decorations") {
        sub = (decorationSubCategories.includes(state.targetSubCategory as DecorationItemType) 
               ? state.targetSubCategory 
               : decorationSubCategories[0]) as string;
      } else if (main === "Food") {
        sub = (foodSubCategories.includes(state.targetSubCategory as FoodCategory) 
               ? state.targetSubCategory 
               : foodSubCategories[0]) as string;
      } else if (main === "Cleaning") {
        sub = (cleaningSubCategories.includes(state.targetSubCategory as CleaningCategory) 
               ? state.targetSubCategory 
               : cleaningSubCategories[0]) as string;
      } else if (main === "Toys") {
        sub = (toySubCategories.includes(state.targetSubCategory as ToyCategory) 
               ? state.targetSubCategory 
               : toySubCategories[0]) as string;
      }
    }
    return { main, sub };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); // This useMemo runs once on mount as location.state is stable for the instance.

  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>(initialTabs.main);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialTabs.sub);
  const [activeColorOptions, setActiveColorOptions] = useState<{ id: string; options: { label: string; src: string }[] } | null>(null);

  // Effect to clear location state after it has been used for initial setup.
  // This prevents the state from re-applying if the user navigates away and back using browser buttons.
  useEffect(() => {
    if (location.state && (location.state as InventoryLocationState).targetMainCategory) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount.

  // Handler for changing the main category.
  const handleMainCategoryChange = (category: MainCategory) => {
    setSelectedMainCategory(category);
    // When main category changes, always reset sub-category to its default.
    if (category === "Decorations") setSelectedSubCategory(decorationSubCategories[0]);
    else if (category === "Food") setSelectedSubCategory(foodSubCategories[0]);
    else if (category === "Cleaning") setSelectedSubCategory(cleaningSubCategories[0]);
    else if (category === "Toys") setSelectedSubCategory(toySubCategories[0]);
    setActiveColorOptions(null); // Reset color options when main category changes.
  };
  
  // Effect to ensure subcategory consistency and reset color options.
  useEffect(() => {
    setActiveColorOptions(null); // Reset color options whenever categories might change.
    // If the current sub-category is not valid for the selected main category, reset it.
    if (selectedMainCategory === "Decorations") {
      if (!decorationSubCategories.includes(selectedSubCategory as DecorationItemType)) {
        setSelectedSubCategory(decorationSubCategories[0]);
      }
    } else if (selectedMainCategory === "Food") {
      if (!foodSubCategories.includes(selectedSubCategory as FoodCategory)) {
        setSelectedSubCategory(foodSubCategories[0]);
      }
    } else if (selectedMainCategory === "Cleaning") {
      if (!cleaningSubCategories.includes(selectedSubCategory as CleaningCategory)) {
        setSelectedSubCategory(cleaningSubCategories[0]);
      }
    } else if (selectedMainCategory === "Toys") {
      if (!toySubCategories.includes(selectedSubCategory as ToyCategory)) {
        setSelectedSubCategory(toySubCategories[0]);
      }
    }
  }, [selectedMainCategory, selectedSubCategory]); // Runs if main or sub category changes.

  // Handler for clicking on an inventory item.
  const handleItemClick = (item: InventoryItem) => {
    if (item.itemCategory === "decoration") {
      const decorationItem = item as DecorationInventoryItem;
      if (decorationItem.colorOptions && decorationItem.colorOptions.length > 0) {
        setActiveColorOptions({ id: decorationItem.id, options: decorationItem.colorOptions });
      } else {
        applyDecorationItem(decorationItem);
        setActiveColorOptions(null);
      }
    } else if (item.itemCategory === "food") {
      if (pet) { onFeedPet(item as FoodInventoryItem); consumeItem(item.id); } 
      else alert("Pet data not loaded! Cannot feed.");
    } else if (item.itemCategory === "cleaning") {
      if (pet) { onCleanPet(item as CleaningInventoryItem); consumeItem(item.id); }
      else alert("Pet data not loaded! Cannot clean.");
    } else if (item.itemCategory === "toy") {
      if (pet) { onPlayWithToy(item as ToyInventoryItem); consumeItem(item.id); }
      else alert("Pet data not loaded! Cannot play.");
    }
  };

  // Applies a decoration item to the room.
  const applyDecorationItem = (item: DecorationInventoryItem) => {
    if (["floor", "wall", "ceiling", "overlay"].includes(item.type)) {
      setRoomLayer(item.type as "floor" | "wall" | "ceiling" | "overlay", item.src);
    } else if (item.type === "backDecor" || item.type === "frontDecor") {
      // Example coordinates, these might need to be user-adjustable in the future.
      addDecorItem(item.type, { src: item.src, x: 100, y: 100 });
    }
  };

  // Filters the inventory items based on the selected main and sub categories.
  const filteredItems = items.filter(item => {
    if (selectedMainCategory === "Decorations") {
      if (item.itemCategory !== "decoration") return false;
      return (item as DecorationInventoryItem).type === selectedSubCategory; 
    } else if (selectedMainCategory === "Food") {
      if (item.itemCategory !== "food") return false;
      return (item as FoodInventoryItem).type === selectedSubCategory;
    } else if (selectedMainCategory === "Cleaning") {
      if (item.itemCategory !== "cleaning") return false;
      return (item as CleaningInventoryItem).type === selectedSubCategory;
    } else if (selectedMainCategory === "Toys") {
      if (item.itemCategory !== "toy") return false;
      return (item as ToyInventoryItem).type === selectedSubCategory;
    }
    return false;
  });

  // Determines the list of sub-categories to display based on the selected main category.
  const currentSubcategories = 
    selectedMainCategory === "Decorations" ? decorationSubCategories :
    selectedMainCategory === "Food" ? foodSubCategories :
    selectedMainCategory === "Cleaning" ? cleaningSubCategories :
    selectedMainCategory === "Toys" ? toySubCategories :
    []; // Fallback to an empty array if no main category matches.

  return (
    <div className="inventory-page-layout">
      <h1 className="inventory-title">Inventory</h1>
      <div className="inventory-grid-scroll-area">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <div 
              key={item.id} 
              className="inventory-item" 
              onClick={() => handleItemClick(item)} 
              title={item.description || item.name}
            >
              <ZoomedImage src={item.src} alt={item.name} />
              <div className="item-name-effect-wrapper"> {/* Wrapper for name and effect */}
                <span className="item-name">{item.name}</span>
                {item.itemCategory === "food" && <span className="item-effect">Hunger +{(item as FoodInventoryItem).hungerRestored}</span>}
                {item.itemCategory === "cleaning" && <span className="item-effect">Clean +{(item as CleaningInventoryItem).cleanlinessBoost}</span>}
                {item.itemCategory === "toy" && <span className="item-effect">Happy +{(item as ToyInventoryItem).happinessBoost}</span>}
              </div>
              {activeColorOptions?.id === item.id && item.itemCategory === "decoration" && (item as DecorationInventoryItem).colorOptions && (
                <div className="color-options">
                  {(item as DecorationInventoryItem).colorOptions!.map(option => ( 
                    <div 
                      key={option.label} 
                      className="color-swatch" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        applyDecorationItem({ ...(item as DecorationInventoryItem), src: option.src }); 
                        setActiveColorOptions(null); 
                      }} 
                      style={{ backgroundImage: `url(${option.src})` }} 
                      title={option.label} 
                    /> 
                  ))}
                </div> 
              )}
            </div> 
          ))
        ) : ( <p className="no-items-message">No items in this category.</p> )}
      </div>
      <div className="inventory-tab-bars-container">
        <div className="inventory-sub-tabs">
          {currentSubcategories.map(categoryValue => ( 
            <button 
              key={categoryValue} 
              className={`tab-button ${selectedSubCategory === categoryValue ? "active" : ""}`} 
              onClick={() => setSelectedSubCategory(categoryValue)}
            > 
              {capitalizeFirstLetter(categoryValue)} 
            </button> 
          ))}
        </div>
        <div className="inventory-main-tabs">
          {mainCategories.map(category => ( 
            <button 
              key={category} 
              className={`main-tab-button ${selectedMainCategory === category ? "active" : ""}`} 
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
