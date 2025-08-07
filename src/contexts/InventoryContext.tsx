// src/contexts/InventoryContext.tsx
import { createContext, useState, useEffect, type ReactNode, useContext, useCallback } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type {
  InventoryItem,
  FoodInventoryItem,
  GroomingInventoryItem,
  ToyInventoryItem,
} from "../types";
import { enhanceFoodItemsWithDescriptions } from "../utils/foodUtils";
import { defaultFoodItems as baseFoodItems } from "../data/inventory/foodItems";
import { defaultGroomingItems as baseGroomingItems } from "../data/inventory/groomingItems";
import { defaultToyItems as baseToyItems } from "../data/inventory/toyItems";

// Export the image cache for reuse in other components
export const imageCache = new Map<string, HTMLImageElement>();
export const zoomStylesCache = new Map<string, React.CSSProperties>();

// Apply enhanced descriptions to food items
const enhancedFoodItems: FoodInventoryItem[] = enhanceFoodItemsWithDescriptions(baseFoodItems);

// Combine all inventory items (excluding decorations, which are now handled separately)
const defaultAllItems: InventoryItem[] = [
    ...enhancedFoodItems,
    ...baseGroomingItems,
    ...baseToyItems
];

interface InventoryContextType {
  items: InventoryItem[];
  consumeItem: (itemId: string) => void;
  getFilteredItems: (mainCategory: string, subCategory: string) => InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
};

const preloadImages = async (items: InventoryItem[]) => {
  const loadPromises = items.map(item => {
    return new Promise<void>((resolve) => {
      if (imageCache.has(item.src)) {
        resolve();
        return;
      }
      const img = new Image();
      img.src = item.src;
      imageCache.set(item.src, img);
      img.onload = () => resolve();
      img.onerror = () => {
        console.error(`Failed to load image: ${item.src}`);
        resolve(); // Resolve anyway to prevent blocking
      };
    });
  });

  await Promise.all(loadPromises);
};

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);

  // Initialize the cache and load inventory data on first render
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Preload only first 5 item images for much faster initial display
        await preloadImages(defaultAllItems.slice(0, 5));

        // Set default items immediately for faster loading
        setItems(defaultAllItems);

        // Load inventory data from Firebase in background
        const inventoryRef = ref(db, "inventory");
        onValue(inventoryRef, (snapshot) => {
          const inventoryData = snapshot.val() as InventoryItem[] | null;
          console.log('Firebase inventory data:', inventoryData ? 
            `Found ${inventoryData.length} items. Categories: ${[...new Set(inventoryData.map(item => item.itemCategory))].join(', ')}` : 
            'No data');
          
          if (inventoryData && Array.isArray(inventoryData) && inventoryData.length > 0) {
            // Check if we have all required categories
            const categories = new Set(inventoryData.map(item => item.itemCategory));
            const requiredCategories = ['food', 'grooming', 'toy'] as const;
            const hasAllCategories = requiredCategories.every(cat => categories.has(cat));
            
            if (!hasAllCategories) {
              console.log('Missing categories in inventory, resetting to defaults');
              set(inventoryRef, defaultAllItems)
                .then(() => {
                  console.log("Default inventory saved to Firebase");
                  setItems(defaultAllItems);
                })
                .catch(error => {
                  console.error("Error saving default inventory:", error);
                  setItems(defaultAllItems);
                });
              return;
            }

            // Ensure price property is set
            const fixedData: InventoryItem[] = inventoryData.map(item => {
              if (item.price === undefined || item.price === null) {
                const def = defaultAllItems.find(d => d.id === item.id);
                return {
                  ...item,
                  price: def?.price ?? 0
                };
              }
              return item;
            });
            setItems(fixedData);
          } else {
            console.log('No valid inventory data found, using default items');
            set(inventoryRef, defaultAllItems)
              .then(() => {
                console.log("Default inventory saved to Firebase");
                setItems(defaultAllItems);
              })
              .catch(error => {
                console.error("Error saving default inventory:", error);
                setItems(defaultAllItems);
              });
          }
        }, { onlyOnce: false });
      } catch (error) {
        console.error("Failed to initialize inventory cache:", error);
        setItems(defaultAllItems);
      }
    };

    void initializeCache();
  }, []);

  const consumeItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    const inventoryRef = ref(db, "inventory");
    set(inventoryRef, updatedItems).catch(error => console.error("Error updating inventory:", error));
  };

  const getFilteredItems = useCallback(
    (mainCategory: string, subCategory: string) => {
      if (mainCategory === "Food") {
        return items.filter((item): item is FoodInventoryItem => item.itemCategory === "food")
          .filter(item => item.type === subCategory);
      } else if (mainCategory === "Grooming") {
        return items.filter((item): item is GroomingInventoryItem => item.itemCategory === "grooming")
          .filter(item => item.type === subCategory);
      } else if (mainCategory === "Toys") {
        return items.filter((item): item is ToyInventoryItem => item.itemCategory === "toy")
          .filter(item => item.type === subCategory);
      } 
      return [];
    },
    [items]
  );

  return (
    <InventoryContext.Provider
      value={{
      items,
      consumeItem,
        getFilteredItems,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
