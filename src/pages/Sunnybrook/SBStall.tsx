import React, { useState, useEffect, useCallback } from "react";
import { useInventory } from "../../contexts/InventoryContext";
import { db } from "../../firebase";
import { ref, onValue, set } from "firebase/database";
import type { FoodInventoryItem } from "../../types";
import StoreTemplate, { type StoreItemWithStock } from "./StoreTemplate";

// Database keys
const STORE_DB_KEY = "stores/stall";
const COINS_DB_KEY = "playerStats/coins";

export default function SBStall() {
  const { items } = useInventory();
  const [storeItems, setStoreItems] = useState<StoreItemWithStock[]>([]);
  const [coins, setCoins] = useState<number>(1000); // Default starting value
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nextRestockTime, setNextRestockTime] = useState<Date | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  // Get next restock time (5am Central Time)
  const getNextRestockTime = useCallback(() => {
    // Get current date in user's timezone
    const now = new Date();
    
    // Create a date for 5am Central Time today
    const centralTimeOffset = -6; // UTC-6 for Central Time (adjust for DST if needed)
    const targetHour = 5;
    
    // Create date in central time zone
    const restockTime = new Date(now);
    
    // Convert to central time to check if we've passed 5am CT
    const currentHourCT = now.getUTCHours() + centralTimeOffset;
    
    // Set to 5am CT today
    restockTime.setUTCHours(targetHour - centralTimeOffset, 0, 0, 0);
    
    // If already past 5am CT today, move to tomorrow
    if (now > restockTime) {
      restockTime.setDate(restockTime.getDate() + 1);
    }
    
    return restockTime;
  }, []);

  // Filter for vegetable and fruit items in snack or treat category
  const getEligibleItems = useCallback(() => {
    return items.filter((item) => {
      // Must be food item
      if (item.itemCategory !== "food") return false;
      
      const foodItem = item as FoodInventoryItem;
      
      // Must be treat or snack
      if (foodItem.type !== "Treat" && foodItem.type !== "Snack") return false;
      
      // Must be fruit or vegetable category (check ID pattern)
      const id = foodItem.id.toLowerCase();
      
      // Check specifically for the category part of the ID
      // Format is typically: food-category-type-name
      // Exclude any exotic items
      if (id.includes('exotic')) return false;
      
      // Must explicitly be fruit or vegetable category
      return id.startsWith('food-fruit-') || id.startsWith('food-vegetable-');
    });
  }, [items]);

  // Generate random stock for the stall
  const generateStallStock = useCallback(() => {
    const eligibleItems = getEligibleItems();
    
    // If no eligible items, return empty array
    if (eligibleItems.length === 0) return [];
    
    // Shuffle eligible items and take up to 4
    const shuffled = [...eligibleItems].sort(() => 0.5 - Math.random());
    const selectedItems = shuffled.slice(0, Math.min(4, shuffled.length));
    
    // Add random stock amount (2-6) to each item
    return selectedItems.map(item => ({
      ...item,
      stock: Math.floor(Math.random() * 5) + 2 // Random 2-6
    }));
  }, [getEligibleItems]);

  // Save stall data to Firebase
  const saveStallData = useCallback((stallItems: StoreItemWithStock[], nextRestock: Date) => {
    const stallRef = ref(db, STORE_DB_KEY);
    set(stallRef, {
      items: stallItems,
      nextRestockTime: nextRestock.toISOString(),
      lastRestockTime: new Date().toISOString()
    }).catch(error => console.error("Error saving stall data:", error));
  }, []);

  // Load stall data from Firebase and handle restocking logic
  useEffect(() => {
    const stallRef = ref(db, STORE_DB_KEY);
    const coinsRef = ref(db, COINS_DB_KEY);
    
    // Listen for changes to the stall data
    const unsubscribeStall = onValue(stallRef, (snapshot) => {
      const stallData = snapshot.val();
      setIsLoading(false);
      
      if (stallData) {
        // Parse the next restock time
        const nextRestock = new Date(stallData.nextRestockTime);
        setNextRestockTime(nextRestock);
        
        const now = new Date();
        
        // Check if it's time to restock
        if (now >= nextRestock) {
          // Generate new stock
          const newStock = generateStallStock();
          const newRestockTime = getNextRestockTime();
          
          // Save to Firebase
          saveStallData(newStock, newRestockTime);
          
          // Update state
          setStoreItems(newStock);
          setNextRestockTime(newRestockTime);
        } else {
          // Use existing stock, filtering out zero-stock items
          setStoreItems((stallData.items || []).filter((item: StoreItemWithStock) => item.stock > 0));
        }
      } else {
        // No data exists, create initial stock
        const initialStock = generateStallStock();
        const initialRestockTime = getNextRestockTime();
        
        // Save to Firebase
        saveStallData(initialStock, initialRestockTime);
        
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
          const newStock = generateStallStock();
          const newRestockTime = getNextRestockTime();
          
          // Save to Firebase
          saveStallData(newStock, newRestockTime);
          
          // Update state
          setStoreItems(newStock);
          setNextRestockTime(newRestockTime);
        }
      }
    }, 60000); // Check every minute
    
    return () => {
      // Clean up subscriptions and interval
      unsubscribeStall();
      unsubscribeCoins();
      clearInterval(checkInterval);
    };
  }, [generateStallStock, getNextRestockTime, saveStallData, nextRestockTime]);

  // Handle item purchase
  const handlePurchase = useCallback((item: StoreItemWithStock) => {
    // Check if we have enough coins
    if (coins >= item.price && item.stock > 0) {
      // Update local state first for immediate UI feedback
      const updatedItems = storeItems
        .map(storeItem => 
        storeItem.id === item.id 
          ? { ...storeItem, stock: storeItem.stock - 1 } 
          : storeItem
        )
        .filter(item => item.stock > 0); // Remove items with 0 stock
      
      setStoreItems(updatedItems);
      
      // Update coins
      const newCoinsAmount = coins - item.price;
      setCoins(newCoinsAmount);
      
      // Save changes to Firebase
      const coinsRef = ref(db, COINS_DB_KEY);
      set(coinsRef, newCoinsAmount)
        .catch(error => console.error("Error updating coins:", error));
      
      const stallRef = ref(db, STORE_DB_KEY);
      set(stallRef, {
        items: updatedItems,
        nextRestockTime: nextRestockTime?.toISOString(),
        lastRestockTime: new Date().toISOString()
      }).catch(error => console.error("Error updating stall data:", error));
      
      // Add item to player's inventory (this would need to be implemented)
      console.log(`Purchased: ${item.name} for ${item.price} coins`);
      
      // Show success message
      setPurchaseMessage(`Successfully purchased ${item.name}!`);
      setTimeout(() => setPurchaseMessage(null), 3000);
    } else {
      // Show insufficient funds message
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
      title="Farmer's Stall"
      imagePath="/locations/sbstall-horizontal.png"
      storeItems={storeItems}
      coins={coins}
      onPurchase={handlePurchase}
      nextRestockTime={nextRestockTime}
      isLoading={isLoading}
    />
  );
}
