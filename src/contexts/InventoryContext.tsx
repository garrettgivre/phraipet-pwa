import React, { useState, useEffect, createContext, useContext } from 'react';
import { InventoryItem } from '../types';
import { defaultAllItems, defaultToyItems, defaultGroomingItems, defaultFoodItems } from '../constants/InventoryItems';
import { ref, get, set, onValue } from 'firebase/database';
import { db } from '../firebase';
import { preloadImages } from '../utils/imageUtils';

interface InventoryContextType {
  items: InventoryItem[];
  defaultToyItems: InventoryItem[];
  defaultGroomingItems: InventoryItem[];
  defaultFoodItems: InventoryItem[];
  consumeItem: (itemId: string) => void;
  getFilteredItems: (mainCategory: string, subCategory: string) => InventoryItem[];
  addAllItemsAndFixNeeds: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
};

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);

  const consumeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const getFilteredItems = (mainCategory: string, subCategory: string) => {
    return items.filter(item => 
      item.itemCategory === mainCategory && 
      (subCategory === 'all' || item.type === subCategory)
    );
  };

  // Initialize the cache and load inventory data on first render
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Preload first 20 item images for quick initial display
        await preloadImages(defaultAllItems.slice(0, 20));

        // Load inventory data from Firebase
        const inventoryRef = ref(db, "inventory");
        
        // Get current inventory
        const inventorySnapshot = await get(inventoryRef);
        const currentInventory = inventorySnapshot.val() || [];

        // Add all toys and grooming items to current inventory
        const newInventory = [
          ...currentInventory,
          ...defaultToyItems,
          ...defaultGroomingItems
        ];

        // Update inventory with all items
        await set(inventoryRef, newInventory);
        console.log("Added all toys and grooming items to inventory");
        setItems(newInventory);

        // Set pet needs to good levels
        const petRef = ref(db, "pets/sharedPet");
        const petSnapshot = await get(petRef);
        const currentPet = petSnapshot.val() || {};

        const updatedPet = {
          ...currentPet,
          hunger: 100,
          happiness: 100,
          cleanliness: 100,
          affection: 100,
          spirit: 100,
          lastNeedsUpdateTime: Date.now()
        };

        await set(petRef, updatedPet);
        console.log("Set all pet needs to good levels");
        
        // Continue with normal inventory subscription
        onValue(inventoryRef, (snapshot) => {
          const inventoryData = snapshot.val() as InventoryItem[] | null;
          if (inventoryData && Array.isArray(inventoryData) && inventoryData.length > 0) {
            setItems(inventoryData);
          }
        });
        
        // Continue preloading remaining items in the background
        setTimeout(() => {
          preloadImages(defaultAllItems.slice(20))
            .catch(err => console.error("Error preloading images:", err));
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize inventory cache:", error);
        setItems(defaultAllItems);
      }
    };

    initializeCache();
  }, []);

  const addAllItemsAndFixNeeds = async () => {
    try {
      // Get current inventory
      const inventoryRef = ref(db, "inventory");
      const inventorySnapshot = await get(inventoryRef);
      const currentInventory = inventorySnapshot.val() || [];

      // Add all toys and grooming items
      const newInventory = [
        ...currentInventory,
        ...defaultToyItems,
        ...defaultGroomingItems
      ];

      // Update inventory
      await set(inventoryRef, newInventory);
      console.log("Added all toys and grooming items to inventory");
      setItems(newInventory);

      // Set pet needs to good levels
      const petRef = ref(db, "pets/sharedPet");
      const petSnapshot = await get(petRef);
      const currentPet = petSnapshot.val() || {};

      const updatedPet = {
        ...currentPet,
        hunger: 100,
        happiness: 100,
        cleanliness: 100,
        affection: 100,
        spirit: 100,
        lastNeedsUpdateTime: Date.now()
      };

      await set(petRef, updatedPet);
      console.log("Set all pet needs to good levels");
    } catch (error) {
      console.error("Error adding items and fixing needs:", error);
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        defaultToyItems,
        defaultGroomingItems,
        defaultFoodItems,
        consumeItem,
        getFilteredItems,
        addAllItemsAndFixNeeds
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
} 