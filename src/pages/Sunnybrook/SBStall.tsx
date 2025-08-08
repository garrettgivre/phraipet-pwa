import React, { useState, useEffect, useCallback } from "react";
import { useInventory } from "../../contexts/InventoryContext";
import { db } from "../../firebase";
import { ref, onValue, set } from "firebase/database";
import type { FoodInventoryItem } from "../../types";
import StoreTemplate, { type StoreItemWithStock } from "./StoreTemplate";

const STORE_DB_KEY = "stores/stall";
const COINS_DB_KEY = "playerStats/coins";

export default function SBStall() {
  const { items } = useInventory();
  const [storeItems, setStoreItems] = useState<StoreItemWithStock[]>([]);
  const [coins, setCoins] = useState<number>(1000);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nextRestockTime, setNextRestockTime] = useState<Date | null>(null);

  const getNextRestockTime = useCallback(() => {
    const now = new Date();
    const centralTimeOffset = -6;
    const targetHour = 5;
    const restockTime = new Date(now);
    restockTime.setUTCHours(targetHour - centralTimeOffset, 0, 0, 0);
    if (now > restockTime) {
      restockTime.setDate(restockTime.getDate() + 1);
    }
    return restockTime;
  }, []);

  const getEligibleItems = useCallback(() => {
    return items.filter((item) => {
      if (item.itemCategory !== "food") return false;
      const foodItem = item as FoodInventoryItem;
      if (foodItem.type !== "Treat" && foodItem.type !== "Snack") return false;
      const id = foodItem.id.toLowerCase();
      if (id.includes('exotic')) return false;
      return id.startsWith('food-fruit-') || id.startsWith('food-vegetable-');
    });
  }, [items]);

  const generateStallStock = useCallback(() => {
    const eligibleItems = getEligibleItems();
    if (eligibleItems.length === 0) return [];
    const shuffled = [...eligibleItems].sort(() => 0.5 - Math.random());
    const selectedItems = shuffled.slice(0, Math.min(4, shuffled.length));
    return selectedItems.map(item => ({
      ...item,
      stock: Math.floor(Math.random() * 5) + 2
    }));
  }, [getEligibleItems]);

  const saveStallData = useCallback((stallItems: StoreItemWithStock[], nextRestock: Date) => {
    const stallRef = ref(db, STORE_DB_KEY);
    set(stallRef, {
      items: stallItems,
      nextRestockTime: nextRestock.toISOString(),
      lastRestockTime: new Date().toISOString()
    }).catch(error => console.error("Error saving stall data:", error));
  }, []);

  useEffect(() => {
    const stallRef = ref(db, STORE_DB_KEY);
    const coinsRef = ref(db, COINS_DB_KEY);

    const unsubscribeStall = onValue(stallRef, (snapshot) => {
      const raw = snapshot.val() as unknown;
      setIsLoading(false);
      if (raw && typeof raw === 'object') {
        const data = raw as { items?: unknown; nextRestockTime?: unknown };
        const nextStr = data.nextRestockTime;
        if (typeof nextStr === 'string') {
          setNextRestockTime(new Date(nextStr));
        }
        const itemsArray = Array.isArray(data.items) ? data.items : [];
        if (itemsArray.length > 0) {
          setStoreItems((itemsArray as StoreItemWithStock[]).filter(item => item.stock > 0));
          return;
        }
      }
      const initialStock = generateStallStock();
      const initialRestockTime = getNextRestockTime();
      saveStallData(initialStock, initialRestockTime);
      setStoreItems(initialStock);
      setNextRestockTime(initialRestockTime);
    });

    const unsubscribeCoins = onValue(coinsRef, (snapshot) => {
      const value = snapshot.val() as unknown;
      if (typeof value === 'number') {
        setCoins(value);
      } else {
        set(coinsRef, 1000).catch(error => console.error("Error initializing coins:", error));
      }
    });

    const checkInterval = setInterval(() => {
      if (nextRestockTime) {
        const now = new Date();
        if (now >= nextRestockTime) {
          const newStock = generateStallStock();
          const newRestock = getNextRestockTime();
          saveStallData(newStock, newRestock);
          setStoreItems(newStock);
          setNextRestockTime(newRestock);
        }
      }
    }, 60000);

    return () => {
      unsubscribeStall();
      unsubscribeCoins();
      clearInterval(checkInterval);
    };
  }, [generateStallStock, getNextRestockTime, saveStallData, nextRestockTime]);

  const handlePurchase = useCallback((item: StoreItemWithStock) => {
    if (coins >= item.price && item.stock > 0) {
      const updatedItems = storeItems
        .map(storeItem => (storeItem.id === item.id ? { ...storeItem, stock: storeItem.stock - 1 } : storeItem))
        .filter(storeItem => storeItem.stock > 0);
      setStoreItems(updatedItems);
      const newCoinsAmount = coins - item.price;
      setCoins(newCoinsAmount);
      const coinsRef = ref(db, COINS_DB_KEY);
      set(coinsRef, newCoinsAmount).catch(error => console.error("Error updating coins:", error));
      const stallRef = ref(db, STORE_DB_KEY);
      set(stallRef, {
        items: updatedItems,
        nextRestockTime: nextRestockTime?.toISOString(),
        lastRestockTime: new Date().toISOString()
      }).catch(error => console.error("Error updating stall data:", error));
    } else {
      console.warn("Purchase failed: insufficient coins or out of stock");
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
