// src/pages/InventoryPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import type { InventoryItem, DecorationInventoryItem, FoodInventoryItem, FoodCategory, Pet as PetType, DecorationItemType } from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import "./InventoryPage.css";

// Define main categories
const mainCategories = ["Decorations", "Food"] as const;
type MainCategory = typeof mainCategories[number];

// Define sub-categories for Decorations using the actual DecorationItemType values
const decorationSubCategories: DecorationItemType[] = ["wall", "floor", "ceiling", "backDecor", "frontDecor", "overlay"];
// No need for a separate DecorationSubCategory type if it's just DecorationItemType

// Define sub-categories for Food
const foodSubCategories: FoodCategory[] = ["Treat", "Snack", "LightMeal", "HeartyMeal", "Feast"];

// Interface for the state passed via react-router-dom's navigate function
interface InventoryLocationState {
  targetMainCategory?: MainCategory;
  targetSubCategory?: string; // This will be validated against DecorationItemType or FoodCategory
}

interface InventoryPageProps {
  pet: PetType | null;
  onFeedPet: (foodItem: FoodInventoryItem) => void;
}

// Helper to capitalize first letter for display if needed
const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  // Handle "backDecor" and "frontDecor" specifically if needed for better display
  if (string === "backDecor") return "Back Decor";
  if (string === "frontDecor") return "Front Decor";
  return string.charAt(0).toUpperCase() + string.slice(1);
};


function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const containerSize = 64;
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${containerSize}px`,
    height: `${containerSize}px`,
    fontSize: '12px',
    color: '#aaa',
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    setImageStyle(prev => ({ ...prev, visibility: 'hidden' }));

    const img = new Image();
    img.src = src;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      calculateVisibleBounds(src)
        .then(bounds => {
          if (bounds.width <= 0 || bounds.height <= 0 || bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
            setError(true);
            setLoaded(true);
            setImageStyle({
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: `${containerSize}px`, height: `${containerSize}px`,
                fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box',
                visibility: 'visible',
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
            visibility: 'visible',
          });
          setLoaded(true);
        })
        .catch((err) => {
          console.error("Error in calculateVisibleBounds for src:", src, err);
          setError(true);
          setLoaded(true);
           setImageStyle({
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: `${containerSize}px`, height: `${containerSize}px`,
                fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box',
                visibility: 'visible',
            });
        });
    };
    img.onerror = () => {
      console.error("Failed to load image for ZoomedImage:", src);
      setError(true);
      setLoaded(true);
      setImageStyle({
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: `${containerSize}px`, height: `${containerSize}px`,
            fontSize: '20px', color: 'red', border: '1px solid #ddd', boxSizing: 'border-box',
            visibility: 'visible',
        });
    };
  }, [src]);

  return (
    <div className="zoom-container">
      {!loaded && <div className="zoom-placeholder" style={{fontSize: '12px', color: '#aaa'}}>...</div>}
      {loaded && error && <div className="zoom-placeholder" style={imageStyle} title={`Error: ${alt}`}>X</div>}
      {loaded && !error && (
        <img
          src={src}
          alt={alt}
          className="inventory-image"
          style={imageStyle}
        />
      )}
    </div>
  );
}

export default function InventoryPage({ pet, onFeedPet }: InventoryPageProps) {
  const { items, setRoomLayer, addDecorItem } = useInventory();
  const location = useLocation();
  const navigate = useNavigate();

  const initialTabs = useMemo(() => {
    const state = location.state as InventoryLocationState | null;
    let main: MainCategory = "Decorations";
    let sub: string = decorationSubCategories[0]; // Default to the first actual type

    if (state?.targetMainCategory) {
      main = state.targetMainCategory;
      if (state.targetMainCategory === "Decorations") {
        // Ensure targetSubCategory is a valid DecorationItemType
        sub = (decorationSubCategories.includes(state.targetSubCategory as DecorationItemType) 
               ? state.targetSubCategory 
               : decorationSubCategories[0]) as string;
      } else if (state.targetMainCategory === "Food") {
         // Ensure targetSubCategory is a valid FoodCategory
        sub = (foodSubCategories.includes(state.targetSubCategory as FoodCategory) 
               ? state.targetSubCategory 
               : foodSubCategories[0]) as string;
      }
    }
    return { main, sub };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>(initialTabs.main);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialTabs.sub);
  const [activeColorOptions, setActiveColorOptions] = useState<{ id: string; options: { label: string; src: string }[] } | null>(null);

  useEffect(() => {
    if (location.state && (location.state as InventoryLocationState).targetMainCategory) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleMainCategoryChange = (category: MainCategory) => {
    setSelectedMainCategory(category);
    if (category === "Decorations") {
      setSelectedSubCategory(decorationSubCategories[0]);
    } else if (category === "Food") {
      setSelectedSubCategory(foodSubCategories[0]);
    }
    setActiveColorOptions(null); // Also reset color options when main category changes
  };
  
  // This useEffect is to ensure subcategory consistency if selectedMainCategory changes programmatically
  // or if selectedSubCategory becomes invalid for the current selectedMainCategory.
  useEffect(() => {
    setActiveColorOptions(null); // Always reset color options when categories change
    if (selectedMainCategory === "Decorations") {
      if (!decorationSubCategories.includes(selectedSubCategory as DecorationItemType)) {
        setSelectedSubCategory(decorationSubCategories[0]);
      }
    } else if (selectedMainCategory === "Food") {
      if (!foodSubCategories.includes(selectedSubCategory as FoodCategory)) {
        setSelectedSubCategory(foodSubCategories[0]);
      }
    }
  }, [selectedMainCategory, selectedSubCategory]);


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
      if (pet) {
        onFeedPet(item as FoodInventoryItem);
      } else {
        alert("Pet data not loaded yet! Cannot feed.");
      }
    }
  };

  const applyDecorationItem = (item: DecorationInventoryItem) => {
    // item.type is already a valid DecorationItemType here
    if (["floor", "wall", "ceiling", "overlay"].includes(item.type)) {
      setRoomLayer(item.type as "floor" | "wall" | "ceiling" | "overlay", item.src);
    } else if (item.type === "backDecor" || item.type === "frontDecor") {
      addDecorItem(item.type, { src: item.src, x: 100, y: 100 });
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedMainCategory === "Decorations") {
      if (item.itemCategory !== "decoration") return false;
      const decItem = item as DecorationInventoryItem;
      // selectedSubCategory here will be one of the DecorationItemType values
      return decItem.type === selectedSubCategory; 
    } else if (selectedMainCategory === "Food") {
      if (item.itemCategory !== "food") return false;
      const foodItem = item as FoodInventoryItem;
      // selectedSubCategory here will be one of the FoodCategory values
      return foodItem.type === selectedSubCategory;
    }
    return false;
  });

  const currentSubcategories = selectedMainCategory === "Decorations" 
    ? decorationSubCategories 
    : foodSubCategories;

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
              <span className="item-name">{item.name}</span>
              {item.itemCategory === "food" && <span className="item-effect">Hunger +{(item as FoodInventoryItem).hungerRestored}</span>}

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
        ) : (
          <p className="no-items-message">No items in this category.</p>
        )}
      </div>
      
      <div className="inventory-tab-bars-container">
        <div className="inventory-sub-tabs">
          {currentSubcategories.map(categoryValue => ( // categoryValue is now like "wall", "floor", "Treat"
            <button
              key={categoryValue}
              className={`tab-button ${selectedSubCategory === categoryValue ? "active" : ""}`}
              onClick={() => setSelectedSubCategory(categoryValue)}
            >
              {capitalizeFirstLetter(categoryValue)} {/* Display capitalized version */}
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
