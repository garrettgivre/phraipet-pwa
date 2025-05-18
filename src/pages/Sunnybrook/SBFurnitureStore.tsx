import React, { useState, useEffect, useCallback } from "react";
import { useDecoration } from "../../contexts/DecorationContext";
import { db } from "../../firebase";
import { ref, onValue, set } from "firebase/database";
import type { DecorationInventoryItem, DecorationItemType } from "../../types";
import StoreTemplate, { type StoreItemWithStock } from "./StoreTemplate";

// Database keys
const STORE_DB_KEY = "stores/furnitureStore";
const COINS_DB_KEY = "playerStats/coins";

// Default decoration items to ensure the store has stock
const DEFAULT_DECORATION_ITEMS: DecorationInventoryItem[] = [
  {
    id: "deco-decor-comfy-armchair",
    name: "Comfy Armchair",
    itemCategory: "decoration",
    type: "decor",
    src: "/assets/decorations/furniture-comfy-armchair.png",
    price: 120,
    description: "A plush armchair that adds comfort and style to any room."
  },
  {
    id: "deco-decor-modern-bookshelf",
    name: "Modern Bookshelf",
    itemCategory: "decoration",
    type: "decor", 
    src: "/assets/decorations/furniture-modern-bookshelf.png",
    price: 150,
    description: "A sleek bookshelf to display your pet's favorite items and books."
  },
  {
    id: "deco-decor-cozy-bed",
    name: "Cozy Pet Bed",
    itemCategory: "decoration",
    type: "decor",
    src: "/assets/decorations/furniture-cozy-bed.png",
    price: 180,
    description: "A luxurious bed where your pet can rest in complete comfort."
  },
  {
    id: "deco-decor-playful-rug",
    name: "Playful Rug",
    itemCategory: "decoration",
    type: "decor",
    src: "/assets/decorations/furniture-playful-rug.png",
    price: 95,
    description: "A colorful rug that brightens up the room and feels nice under paws."
  },
  {
    id: "deco-decor-wall-picture",
    name: "Framed Picture",
    itemCategory: "decoration",
    type: "decor",
    src: "/assets/decorations/accessory-wall-picture.png",
    price: 85,
    description: "A beautiful framed picture to hang on your pet's wall."
  },
  {
    id: "deco-decor-plant-fern",
    name: "Decorative Fern",
    itemCategory: "decoration",
    type: "decor",
    src: "/assets/decorations/accessory-plant-fern.png",
    price: 65,
    description: "A lovely fern that adds a touch of nature to your pet's home."
  }
];

export default function SBFurnitureStore() {
  const { decorations } = useDecoration();
  const [storeItems, setStoreItems] = useState<StoreItemWithStock[]>([]);
  const [coins, setCoins] = useState<number>(1000);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nextRestockTime, setNextRestockTime] = useState<Date | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  // Get next restock time (Sunday at 6am Central Time)
  const getNextRestockTime = useCallback((baseDate: Date | null = null) => {
    // Use provided base date or current date
    const now = baseDate || new Date();
    
    // Create a date for 6am Central Time today
    const centralTimeOffset = -6; // UTC-6 for Central Time (adjust for DST if needed)
    const targetHour = 6;
    
    // Create date in central time zone
    const restockTime = new Date(now);
    
    // Set to 6am CT today
    restockTime.setUTCHours(targetHour - centralTimeOffset, 0, 0, 0);
    
    // If already past 6am CT today, move to next day
    if (now > restockTime) {
      restockTime.setDate(restockTime.getDate() + 1);
    }
    
    // Find the next Sunday (day 0)
    const dayOfWeek = restockTime.getUTCDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    restockTime.setDate(restockTime.getDate() + daysUntilSunday);
    
    return restockTime;
  }, []);

  // Filter for decoration items 
  const getEligibleItems = useCallback(() => {
    return decorations.filter(item => {
      // Focus on decor items (furniture and accessories)
      return item.type === "decor" && (
        item.id.includes("furniture") || 
        item.id.includes("accessory") || 
        item.id.includes("decor")
      );
    });
  }, [decorations]);

  // Generate random stock for the furniture store
  const generateFurnitureStock = useCallback((existingItems: StoreItemWithStock[] = []) => {
    const eligibleItems = getEligibleItems();
    
    // If no eligible decorations, return empty array or existing items
    if (eligibleItems.length === 0) return existingItems.filter(item => item.stock > 0);
    
    // Get IDs of existing items
    const existingIds = existingItems.map(item => item.id);
    
    // Filter out existing items that are already in stock 
    const newEligibleItems = eligibleItems.filter(item => 
      !existingIds.includes(item.id)
    );
    
    // Prepare result array with existing items that still have stock
    const result = existingItems
      .filter(item => item.stock > 0)
      .map(item => ({ ...item }));
    
    // Determine how many additional items to add (to reach 4 total)
    const neededItems = Math.max(0, 4 - result.length);
    
    if (neededItems > 0 && newEligibleItems.length > 0) {
      // Shuffle eligible items and take what we need
      const shuffled = [...newEligibleItems].sort(() => 0.5 - Math.random());
      const selectedNewItems = shuffled.slice(0, Math.min(neededItems, shuffled.length));
      
      // Add random stock amount (1-2) to each new item
      const newItems = selectedNewItems.map(item => ({
        ...item,
        stock: Math.floor(Math.random() * 2) + 1 // Random 1-2
      }));
      
      result.push(...newItems);
    }
    
    return result;
  }, [getEligibleItems]);

  // Save furniture store data to Firebase
  const saveStoreData = useCallback((storeItems: StoreItemWithStock[], nextRestock: Date) => {
    const storeRef = ref(db, STORE_DB_KEY);
    set(storeRef, {
      items: storeItems,
      nextRestockTime: nextRestock.toISOString(),
      lastRestockTime: new Date().toISOString()
    }).catch(error => console.error("Error saving furniture store data:", error));
  }, []);

  // Load furniture store data from Firebase and handle restocking logic
  useEffect(() => {
    const storeRef = ref(db, STORE_DB_KEY);
    const coinsRef = ref(db, COINS_DB_KEY);
    
    // Listen for changes to the furniture store data
    const unsubscribeStore = onValue(storeRef, (snapshot) => {
      const storeData = snapshot.val();
      setIsLoading(false);
      
      if (storeData) {
        // Parse the next restock time
        const nextRestock = new Date(storeData.nextRestockTime);
        setNextRestockTime(nextRestock);
        
        const now = new Date();
        
        // Check if it's time to restock
        if (now >= nextRestock) {
          // Generate new stock (keeping existing stock that isn't sold out)
          const newStock = generateFurnitureStock(storeData.items || []);
          const newRestockTime = getNextRestockTime();
          
          // Save to Firebase
          saveStoreData(newStock, newRestockTime);
          
          // Update state
          setStoreItems(newStock);
          setNextRestockTime(newRestockTime);
        } else {
          // Use existing stock
          setStoreItems(storeData.items || []);
        }
      } else {
        // No data exists, create initial stock
        const initialStock = generateFurnitureStock();
        const initialRestockTime = getNextRestockTime();
        
        // Save to Firebase
        saveStoreData(initialStock, initialRestockTime);
        
        // Update state
        setStoreItems(initialStock);
        setNextRestockTime(initialRestockTime);
      }
    });
    
    // Listen for changes to the coins
    const unsubscribeCoins = onValue(coinsRef, (snapshot) => {
      const coinsData = snapshot.val();
      if (coinsData !== null) {
        setCoins(coinsData);
      } else {
        // If no coins data, initialize with default
        set(coinsRef, 1000)
          .catch(error => console.error("Error initializing coins:", error));
      }
    });
    
    // Set up interval to check for restocking every minute
    const checkInterval = setInterval(() => {
      if (nextRestockTime) {
        const now = new Date();
        if (now >= nextRestockTime) {
          // Generate new stock
          const newStock = generateFurnitureStock(storeItems);
          const newRestockTime = getNextRestockTime();
          
          // Save to Firebase
          saveStoreData(newStock, newRestockTime);
          
          // Update state
          setStoreItems(newStock);
          setNextRestockTime(newRestockTime);
        }
      }
    }, 60000); // Check every minute
    
    return () => {
      // Clean up subscriptions and interval
      unsubscribeStore();
      unsubscribeCoins();
      clearInterval(checkInterval);
    };
  }, [generateFurnitureStock, getNextRestockTime, saveStoreData, nextRestockTime, storeItems]);

  // Handle item purchase
  const handlePurchase = useCallback((item: StoreItemWithStock) => {
    // Check if we have enough coins
    if (coins >= item.price && item.stock > 0) {
      // Update local state first for immediate UI feedback
      setStoreItems(prev => prev.map(storeItem => 
        storeItem.id === item.id 
          ? { ...storeItem, stock: storeItem.stock - 1 } 
          : storeItem
      ));
      
      // Update coins
      const newCoinsAmount = coins - item.price;
      setCoins(newCoinsAmount);
      
      // Save changes to Firebase
      const coinsRef = ref(db, COINS_DB_KEY);
      set(coinsRef, newCoinsAmount)
        .catch(error => console.error("Error updating coins:", error));
      
      const storeRef = ref(db, STORE_DB_KEY);
      const updatedItems = storeItems.map(storeItem => 
        storeItem.id === item.id 
          ? { ...storeItem, stock: storeItem.stock - 1 } 
          : storeItem
      );
      
      set(storeRef, {
        items: updatedItems,
        nextRestockTime: nextRestockTime?.toISOString(),
        lastRestockTime: new Date().toISOString()
      }).catch(error => console.error("Error updating furniture store data:", error));
      
      // Add decoration to player's room (this would need to be implemented)
      console.log(`Purchased decoration: ${item.name} for ${item.price} coins`);
      
      // Show success message
      setPurchaseMessage(`Successfully purchased ${item.name}!`);
      setTimeout(() => setPurchaseMessage(null), 3000);
    } else {
      // Show error message
      setPurchaseMessage(
        item.stock <= 0 
          ? "This item is out of stock!" 
          : "Not enough coins to make this purchase!"
      );
      setTimeout(() => setPurchaseMessage(null), 3000);
    }
  }, [coins, storeItems, nextRestockTime]);

  return (
    <StoreTemplate
      title="Furniture Emporium"
      imagePath="/locations/sbfurniture-horizontal.png"
      storeItems={storeItems}
      coins={coins}
      onPurchase={handlePurchase}
      nextRestockTime={nextRestockTime}
      isLoading={isLoading}
    />
  );
} 