import React, { useEffect, useState } from "react";
import { useInventory } from "../contexts/InventoryContext";
import type { InventoryItem, DecorationInventoryItem, FoodInventoryItem, FoodCategory, Pet as PetType } from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import "./InventoryPage.css";

// Define main categories
const mainCategories = ["Decorations", "Food"] as const;
type MainCategory = typeof mainCategories[number];

// Define sub-categories for Decorations
const decorationSubCategories = ["Walls", "Floors", "Ceilings", "Decor", "Overlays"] as const;
type DecorationSubCategory = typeof decorationSubCategories[number];

// Define sub-categories for Food
const foodSubCategories: FoodCategory[] = ["Treat", "Snack", "LightMeal", "HeartyMeal", "Feast"];
// Removed duplicate type FoodSubCategory, FoodCategory from types.ts is sufficient

interface InventoryPageProps {
  pet: PetType | null;
  onFeedPet: (foodItem: FoodInventoryItem) => void;
}

function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({
    // Initial style to prevent flash of unstyled content or ensure placeholder is visible
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    fontSize: '10px',
    color: 'grey'
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    setImageStyle({ /* Reset style for loading state */ }); // Clear previous image style

    const img = new Image();
    img.src = src;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      calculateVisibleBounds(src)
        .then(bounds => {
          const containerSize = 64; // Desired display size in the grid

          if (bounds.width <= 0 || bounds.height <= 0) { // Handle fully transparent or invalid bounds
            setError(true);
            setLoaded(true);
            return;
          }
          
          // Scale to fit the *visible part* within the container
          const scale = Math.min(containerSize / bounds.width, containerSize / bounds.height);

          // Dimensions of the original image, scaled
          const scaledNaturalWidth = bounds.naturalWidth * scale;
          const scaledNaturalHeight = bounds.naturalHeight * scale;
          
          // Translate the *original scaled image* so that the *scaled visible part* is centered.
          // Position the top-left of the scaled visible part (bounds.x * scale, bounds.y * scale)
          // such that it's centered in the container.
          const translateX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale);
          const translateY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);

          setImageStyle({
            position: "absolute",
            left: `${translateX}px`,
            top: `${translateY}px`,
            width: `${scaledNaturalWidth}px`,
            height: `${scaledNaturalHeight}px`,
          });
          setLoaded(true);
        })
        .catch((err) => {
          console.error("Error in calculateVisibleBounds for src:", src, err);
          setError(true);
          setLoaded(true);
        });
    };
    img.onerror = () => {
      console.error("Failed to load image for ZoomedImage:", src);
      setError(true);
      setLoaded(true);
    };
  }, [src]);

  return (
    <div className="zoom-container">
      {loaded && !error && (
        <img
          src={src}
          alt={alt}
          className="inventory-image"
          style={imageStyle}
        />
      )}
      {loaded && error && (
        <div className="zoom-placeholder" title={`Error loading ${alt}`}>X</div>
      )}
      {!loaded && (
        <div className="zoom-placeholder">...</div> // Loading indicator
      )}
    </div>
  );
}

export default function InventoryPage({ pet, onFeedPet }: InventoryPageProps) {
  const { items, setRoomLayer, addDecorItem } = useInventory();
  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>("Decorations");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(decorationSubCategories[0]);
  const [activeColorOptions, setActiveColorOptions] = useState<{ id: string; options: { label: string; src: string }[] } | null>(null);

  useEffect(() => {
    if (selectedMainCategory === "Decorations") {
      setSelectedSubCategory(decorationSubCategories[0]);
    } else if (selectedMainCategory === "Food") {
      setSelectedSubCategory(foodSubCategories[0]);
    }
    setActiveColorOptions(null);
  }, [selectedMainCategory]);

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
        // Consider a more user-friendly notification system than alert
        alert("Pet data not loaded yet! Cannot feed.");
      }
    }
  };

  const applyDecorationItem = (item: DecorationInventoryItem) => {
    if (["floor", "wall", "ceiling"].includes(item.type)) {
      setRoomLayer(item.type as "floor" | "wall" | "ceiling", item.src);
    } else if (item.type === "backDecor" || item.type === "frontDecor") {
      addDecorItem(item.type, { src: item.src, x: 100, y: 100 }); // Example coordinates
    } else if (item.type === "overlay") {
      setRoomLayer("overlay", item.src);
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedMainCategory === "Decorations") {
      if (item.itemCategory !== "decoration") return false;
      const decItem = item as DecorationInventoryItem;
      switch (selectedSubCategory as DecorationSubCategory) {
        case "Walls": return decItem.type === "wall";
        case "Floors": return decItem.type === "floor";
        case "Ceilings": return decItem.type === "ceiling";
        case "Decor": return decItem.type === "backDecor" || decItem.type === "frontDecor";
        case "Overlays": return decItem.type === "overlay";
        default: return false;
      }
    } else if (selectedMainCategory === "Food") {
      if (item.itemCategory !== "food") return false;
      const foodItem = item as FoodInventoryItem;
      return foodItem.type === (selectedSubCategory as FoodCategory);
    }
    return false;
  });

  const currentSubcategories = selectedMainCategory === "Decorations" ? decorationSubCategories : foodSubCategories;

  return (
    <div className="inventory-page-container"> {/* Renamed for clarity */}
      <h1 className="inventory-title">Inventory</h1>
      
      <div className="inventory-grid-container"> {/* Scrollable container for items */}
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
      
      {/* Sub Category Tabs - Above Main Category Tabs */}
      <div className="inventory-sub-tabs">
        {currentSubcategories.map(category => (
          <button
            key={category}
            className={`tab-button ${selectedSubCategory === category ? "active" : ""}`}
            onClick={() => setSelectedSubCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Main Category Tabs - Above NavBar */}
      <div className="inventory-main-tabs">
        {mainCategories.map(category => (
          <button
            key={category}
            className={`main-tab-button ${selectedMainCategory === category ? "active" : ""}`}
            onClick={() => setSelectedMainCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}