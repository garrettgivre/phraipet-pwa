import React, { useEffect, useState } from "react"; // Added React import for CSSProperties
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
type FoodSubCategory = typeof foodSubCategories[number];

interface InventoryPageProps {
  pet: PetType | null;
  onFeedPet: (foodItem: FoodInventoryItem) => void;
}

export default function InventoryPage({ pet, onFeedPet }: InventoryPageProps) {
  const { items, setRoomLayer, addDecorItem } = useInventory();
  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>("Decorations");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(decorationSubCategories[0]); // Default to first decoration sub-category
  const [activeColorOptions, setActiveColorOptions] = useState<{ id: string; options: { label: string; src: string }[] } | null>(null);

  useEffect(() => {
    // Reset sub-category when main category changes
    if (selectedMainCategory === "Decorations") {
      setSelectedSubCategory(decorationSubCategories[0]);
    } else if (selectedMainCategory === "Food") {
      setSelectedSubCategory(foodSubCategories[0]);
    }
    setActiveColorOptions(null); // Clear color options when category changes
  }, [selectedMainCategory]);


  const handleItemClick = (item: InventoryItem) => {
    if (item.itemCategory === "decoration") {
      const decorationItem = item as DecorationInventoryItem;
      if (decorationItem.colorOptions) {
        setActiveColorOptions({ id: decorationItem.id, options: decorationItem.colorOptions });
      } else {
        applyDecorationItem(decorationItem);
        setActiveColorOptions(null);
      }
    } else if (item.itemCategory === "food") {
      if (pet) { // Ensure pet data is available
        onFeedPet(item as FoodInventoryItem);
      } else {
        alert("Pet data not loaded yet!");
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
      return foodItem.type === (selectedSubCategory as FoodSubCategory);
    }
    return false;
  });

  const currentSubcategories = selectedMainCategory === "Decorations" ? decorationSubCategories : foodSubCategories;

  return (
    <div className="inventory-page">
      <h1>Inventory</h1>

      {/* Main Category Tabs */}
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
      
      {/* Item Grid */}
      <div className="inventory-grid">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="inventory-item"
            onClick={() => handleItemClick(item)}
            title={item.description || item.name}
          >
            <ZoomedImage src={item.src} alt={item.name} />
            <span>{item.name}</span>
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
        ))}
        {filteredItems.length === 0 && <p>No items in this category.</p>}
      </div>

      {/* Sub Category Tabs - At the bottom */}
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
    </div>
  );
}

function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false); // Reset loaded state on src change
    calculateVisibleBounds(src)
      .then(bounds => {
        const containerSize = 64; // Desired display size in the grid

        // Ensure visible dimensions are at least 1 to prevent division by zero
        const visibleWidth = Math.max(1, bounds.width);
        const visibleHeight = Math.max(1, bounds.height);
        
        // Ensure natural dimensions are at least 1
        const naturalWidth = Math.max(1, bounds.naturalWidth);
        const naturalHeight = Math.max(1, bounds.naturalHeight);

        if (bounds.width === 0 || bounds.height === 0) { // Handle cases where visible part is 0x0 (e.g. fully transparent)
            setImageStyle({
                position: "absolute",
                width: `${containerSize}px`, // Fill container as a fallback
                height: `${containerSize}px`,
                objectFit: "contain", // Try to show something
            });
            setLoaded(true);
            return;
        }
        
        // Determine scale factor to fit visible part into container
        const scale = Math.min(containerSize / visibleWidth, containerSize / visibleHeight);

        // Dimensions of the img tag (scaled natural dimensions)
        const scaledNaturalWidth = naturalWidth * scale;
        const scaledNaturalHeight = naturalHeight * scale;
        
        // Translate the scaled image:
        // 1. Align the top-left of the *scaled visible part* with the container's top-left:
        //    left = -bounds.x * scale
        //    top = -bounds.y * scale
        // 2. Center the *scaled visible part* within the container:
        //    offsetX_for_centering = (containerSize - visibleWidth * scale) / 2
        //    offsetY_for_centering = (containerSize - visibleHeight * scale) / 2
        // Combine these:
        const translateX = (containerSize - visibleWidth * scale) / 2 - (bounds.x * scale);
        const translateY = (containerSize - visibleHeight * scale) / 2 - (bounds.y * scale);

        setImageStyle({
          position: "absolute",
          left: `${translateX}px`,
          top: `${translateY}px`,
          width: `${scaledNaturalWidth}px`,
          height: `${scaledNaturalHeight}px`,
        });
        setLoaded(true);
      })
      .catch((error) => {
        console.error("Error in ZoomedImage for src:", src, error);
        // Fallback style or indication
        setImageStyle({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            fontSize: '10px',
            color: 'grey'
        }); 
        setLoaded(true); // Mark as loaded to show placeholder text
      });
  }, [src]);

  return (
    <div className="zoom-container"> {/* This is 64x64 and overflow: hidden from CSS */}
      {loaded ? (
        <img
          src={src}
          alt={alt}
          className="inventory-image" // CSS for this might just be display: block or similar
          style={imageStyle}
        />
      ) : (
        <div className="zoom-placeholder" style={imageStyle}>?</div> // Placeholder for loading/error
      )}
    </div>
  );
}