// src/pages/InventoryPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInventory, imageCache, zoomStylesCache } from "../contexts/InventoryContext";
import type {
  InventoryItem,
  FoodInventoryItem,
  GroomingInventoryItem,
  ToyInventoryItem,
  FoodCategory,
  GroomingCategory,
  ToyCategory,
  Pet as PetType,
} from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import BackButton from "../components/BackButton";
import "./InventoryPage.css";
import ItemDetailsModal from "../components/ItemDetailsModal";

// Removed Decorations from main categories
const mainCategories = ["Food", "Grooming", "Toys"] as const;
type MainCategory = (typeof mainCategories)[number];

const foodSubCategories = [
  "Treat", "Snack", "LightMeal", "HeartyMeal", "Feast",
] as const satisfies readonly FoodCategory[];
// MODIFIED: groomingSubCategories now only contains the 5 main types
const groomingSubCategories = [
  "QuickFix", "BasicKit", "StandardSet", "PremiumCare", "LuxurySpa",
] as const satisfies readonly GroomingCategory[];
const toySubCategories = [
  "Basic", "Classic", "Plushie", "Gadget", "Wonder",
] as const satisfies readonly ToyCategory[];

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
    QuickFix: "Quick Fix",
    BasicKit: "Basic Kit", 
    StandardSet: "Standard Set", 
    PremiumCare: "Premium Care",
    LuxurySpa: "Luxury Spa", 
    LightMeal: "Light Meal", 
    HeartyMeal: "Hearty Meal",
  };
  if (specialCases[string]) return specialCases[string];
  // Generic capitalization for single words or rely on direct enum value if it's already capitalized
  return string.charAt(0).toUpperCase() + string.slice(1).replace(/([A-Z])/g, ' $1').trim();
};

function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const containerSize = 64;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({
    visibility: 'hidden'
  });

  useEffect(() => {
    let isMounted = true;
    setLoaded(false);
    setError(false);
    setImageStyle(prev => ({ ...prev, visibility: 'hidden' }));

    // Function to handle simple loading
    const handleSimpleLoading = () => {
      if (!isMounted) return;
      const simpleStyle: React.CSSProperties = {
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        visibility: 'visible'
      };
      setImageStyle(simpleStyle);
      setLoaded(true);
    };
    
    // Function to handle complex loading with zoom
    const handleComplexLoading = async () => {
      if (!isMounted) return;
      
      // Check if we already have cached styles for this image
      if (zoomStylesCache.has(src)) {
        // Use cached styles
        setImageStyle(zoomStylesCache.get(src)!);
        setLoaded(true);
        return;
      }
      
      try {
        const bounds = await calculateVisibleBounds(src);
        
        if (!isMounted) return;
        
        // Ensure we have valid dimensions
        if (bounds.width <= 0 || bounds.height <= 0 || bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
          console.warn("Invalid bounds for image:", src, bounds);
          // Fall back to simple loading
          handleSimpleLoading();
          return;
        }
        
        // Calculate the scale to fit the visible part of the image
        const scale = Math.min(
          containerSize / bounds.width,
          containerSize / bounds.height
        );
        
        // Calculate the dimensions after scaling
        const scaledNaturalWidth = bounds.naturalWidth * scale;
        const scaledNaturalHeight = bounds.naturalHeight * scale;
        
        // Calculate offsets to center the visible part
        const offsetX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale);
        const offsetY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);
        
        // Create the style object
        const zoomedStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          width: `${scaledNaturalWidth}px`,
          height: `${scaledNaturalHeight}px`,
          visibility: 'visible'
        };
        
        // Cache the calculated style for future use
        zoomStylesCache.set(src, zoomedStyle);
        
        setImageStyle(zoomedStyle);
        setLoaded(true);
      } catch (err) {
        console.error("Error calculating visible bounds:", err);
        // Fall back to simple loading on error
        if (isMounted) {
          handleSimpleLoading();
        }
      }
    };

    // Check if image is already in cache
    if (imageCache.has(src)) {
      const cachedImg = imageCache.get(src)!;
      
      if (cachedImg.complete) {
        handleSimpleLoading();
      } else {
        cachedImg.onload = () => {
          handleSimpleLoading();
        };
        
        cachedImg.onerror = () => {
          if (!isMounted) return;
          console.error("Cached image error:", src);
          setError(true);
          setLoaded(true);
        };
      }
    } else {
      const img = new Image();
      img.src = src;
      img.crossOrigin = "anonymous";
      imageCache.set(src, img);

      img.onload = () => {
        handleSimpleLoading();
      };

      img.onerror = () => {
        if (!isMounted) return;
        console.error("Failed to load image:", src);
        setError(true);
        setLoaded(true);
      };
    }

    return () => { isMounted = false; };
  }, [src, containerSize]);

  return (
    <div className="sq-inventory-item-image-wrapper">
      {!loaded && <div className="sq-inventory-item-placeholder-text">...</div>}
      {loaded && error && <div className="sq-inventory-item-placeholder-text error">X</div>}
      {loaded && !error && (
        <img src={src} alt={alt} className="sq-inventory-item-image-content" style={imageStyle} />
      )}
    </div>
  );
}

export default function InventoryPage({ pet, onFeedPet, onGroomPet, onPlayWithToy }: InventoryPageProps) {
  const { consumeItem, getFilteredItems } = useInventory();
  const location = useLocation();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);

  const initialTabs = useMemo(() => {
    const state = location.state as InventoryLocationState | null;
    let main: MainCategory = "Food";
    let sub: string = foodSubCategories[0]; // Default
    if (state?.targetMainCategory) {
      main = state.targetMainCategory;
      if (main === "Food") sub = (foodSubCategories.includes(state.targetSubCategory as FoodCategory) ? state.targetSubCategory : foodSubCategories[0]) as string;
      else if (main === "Grooming") sub = (groomingSubCategories.includes(state.targetSubCategory as GroomingCategory) ? state.targetSubCategory : groomingSubCategories[0]) as string;
      else if (main === "Toys") sub = (toySubCategories.includes(state.targetSubCategory as ToyCategory) ? state.targetSubCategory : toySubCategories[0]) as string;
    }
    return { main, sub } as const;
  }, [location.state]);

  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>(initialTabs.main);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialTabs.sub);

  useEffect(() => {
    if (location.state && (location.state as InventoryLocationState).targetMainCategory) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Preload essential items on component mount
  useEffect(() => {
    // Preload images for the initially visible category
    const essentialItems = getFilteredItems(initialTabs.main, initialTabs.sub);
    const preloadPromises = essentialItems.slice(0, 12).map(item => {
      return new Promise<void>((resolve) => {
        if (imageCache.has(item.src)) {
          resolve();
          return;
        }
        const img = new Image();
        img.src = item.src;
        imageCache.set(item.src, img);
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Resolve anyway to not block other images
      });
    });
    
    void Promise.all(preloadPromises).catch(err => 
      console.error("Error preloading inventory images:", err)
    );
  }, [initialTabs.main, initialTabs.sub, getFilteredItems]);

  const handleMainCategoryChange = useCallback((category: MainCategory) => {
    setIsTransitioning(true);
    setSelectedMainCategory(category);
    if (category === "Food") setSelectedSubCategory(foodSubCategories[0]);
    else if (category === "Grooming") setSelectedSubCategory(groomingSubCategories[0]);
    else if (category === "Toys") setSelectedSubCategory(toySubCategories[0]);
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
    let currentSubIsValid = false;
    if (selectedMainCategory === "Food") {
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

  const handleItemClick = useCallback((item: InventoryItem) => {
    // For consumable items (food, grooming, toys), show the details modal
    setSelectedItem(item);
    setShowItemDetails(true);
  }, []);

  const handleUseItem = useCallback((item: InventoryItem) => {
    if (item.itemCategory === "food") {
      if (pet) { 
        onFeedPet(item as FoodInventoryItem); 
        consumeItem(item.id); 
      }
      else console.warn("Pet data not loaded! Cannot feed.");
    } else if (item.itemCategory === "grooming") {
      if (pet) { 
        onGroomPet(item as GroomingInventoryItem); 
        consumeItem(item.id); 
      }
      else console.warn("Pet data not loaded! Cannot groom.");
    } else if (item.itemCategory === "toy") {
      if (pet) { 
        onPlayWithToy(item as ToyInventoryItem); 
        consumeItem(item.id); 
      }
      else console.warn("Pet data not loaded! Cannot play.");
    }
    setShowItemDetails(false);
  }, [pet, onFeedPet, onGroomPet, onPlayWithToy, consumeItem]);

  const handleDiscardItem = useCallback((item: InventoryItem) => {
    consumeItem(item.id);
    setShowItemDetails(false);
  }, [consumeItem]);

  const filteredItems = useMemo(() => 
    getFilteredItems(selectedMainCategory, selectedSubCategory),
    [getFilteredItems, selectedMainCategory, selectedSubCategory]
  );

  const currentSubcategories = useMemo(() => {
    if (selectedMainCategory === "Food") return foodSubCategories as readonly string[];
    if (selectedMainCategory === "Grooming") return groomingSubCategories as readonly string[];
    if (selectedMainCategory === "Toys") return toySubCategories as readonly string[];
    return [] as const as readonly string[];
  }, [selectedMainCategory]);

  return (
    <div className="sq-inventory-page-wrapper">
      <div className="sq-inventory-header">
        <h1 className="sq-inventory-title-bar">Inventory</h1>
      </div>
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
      
      {/* Item Details Modal */}
      <ItemDetailsModal
        isOpen={showItemDetails}
        item={selectedItem}
        onUse={handleUseItem}
        onDiscard={handleDiscardItem}
        onClose={() => setShowItemDetails(false)}
      />
      
      <BackButton />
    </div>
  );
}
