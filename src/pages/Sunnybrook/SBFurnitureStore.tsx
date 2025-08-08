import React, { useState, useEffect, useCallback } from "react";
import { useDecoration } from "../../contexts/DecorationContext";
import { db } from "../../firebase";
import { ref, onValue, set } from "firebase/database";
import StoreTemplate, { type StoreItemWithStock } from "./StoreTemplate";

// Database keys
const STORE_DB_KEY = "stores/furnitureStore";
const COINS_DB_KEY = "playerStats/coins";

export default function SBFurnitureStore() {
  const { decorations } = useDecoration();
  const [storeItems, setStoreItems] = useState<StoreItemWithStock[]>([]);
  const [coins, setCoins] = useState<number>(1000);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nextRestockTime, setNextRestockTime] = useState<Date | null>(null);

  const getNextRestockTime = useCallback((baseDate: Date | null = null) => {
    const now = baseDate || new Date();
    const centralTimeOffset = -6; // UTC-6 (no DST handling here)
    const targetHour = 6;
    const restockTime = new Date(now);
    restockTime.setUTCHours(targetHour - centralTimeOffset, 0, 0, 0);
    if (now > restockTime) {
      restockTime.setDate(restockTime.getDate() + 1);
    }
    const dayOfWeek = restockTime.getUTCDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    restockTime.setDate(restockTime.getDate() + daysUntilSunday);
    return restockTime;
  }, []);

  const getEligibleItems = useCallback(() => {
    return decorations.filter(item => item.type === "furniture");
  }, [decorations]);

  const generateFurnitureStock = useCallback((existingItems: StoreItemWithStock[] = []) => {
    const eligibleItems = getEligibleItems();
    if (eligibleItems.length === 0) return existingItems.filter(item => item.stock > 0);
    const existingIds = existingItems.map(item => item.id);
    const newEligibleItems = eligibleItems.filter(item => !existingIds.includes(item.id));
    const result = existingItems.filter(item => item.stock > 0).map(item => ({ ...item }));
    const neededItems = Math.max(0, 4 - result.length);
    if (neededItems > 0 && newEligibleItems.length > 0) {
      const shuffled = [...newEligibleItems].sort(() => 0.5 - Math.random());
      const selectedNewItems = shuffled.slice(0, Math.min(neededItems, shuffled.length));
      const newItems: StoreItemWithStock[] = selectedNewItems.map(item => ({
        ...item,
        stock: Math.floor(Math.random() * 2) + 1,
      }));
      result.push(...newItems);
    }
    return result;
  }, [getEligibleItems]);

  const saveStoreData = useCallback((itemsToSave: StoreItemWithStock[], nextRestock: Date) => {
    const storeRef = ref(db, STORE_DB_KEY);
    set(storeRef, {
      items: itemsToSave,
      nextRestockTime: nextRestock.toISOString(),
      lastRestockTime: new Date().toISOString(),
    }).catch(error => console.error("Error saving furniture store data:", error));
  }, []);

  useEffect(() => {
    const storeRef = ref(db, STORE_DB_KEY);
    const coinsRef = ref(db, COINS_DB_KEY);

    const unsubscribeStore = onValue(storeRef, (snapshot) => {
      const raw = snapshot.val() as unknown;
      setIsLoading(false);

      if (raw && typeof raw === 'object') {
        const data = raw as { items?: unknown; nextRestockTime?: unknown };
        const nextStr = data.nextRestockTime;
        if (typeof nextStr === 'string') {
          setNextRestockTime(new Date(nextStr));
        }
        const itemsArray = Array.isArray(data.items) ? (data.items as StoreItemWithStock[]) : [];
        if (itemsArray.length > 0) {
          setStoreItems(itemsArray);
          return;
        }
      }

      // Initialize if missing or invalid
      const initialStock = generateFurnitureStock();
      const initialRestockTime = getNextRestockTime();
      saveStoreData(initialStock, initialRestockTime);
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
          const newStock = generateFurnitureStock(storeItems);
          const newRestockTime = getNextRestockTime();
          saveStoreData(newStock, newRestockTime);
          setStoreItems(newStock);
          setNextRestockTime(newRestockTime);
        }
      }
    }, 60000);

    return () => {
      unsubscribeStore();
      unsubscribeCoins();
      clearInterval(checkInterval);
    };
  }, [generateFurnitureStock, getNextRestockTime, saveStoreData, nextRestockTime, storeItems]);

  const handlePurchase = useCallback((item: StoreItemWithStock) => {
    if (coins >= item.price && item.stock > 0) {
      setStoreItems(prev => prev.map(storeItem => (
        storeItem.id === item.id ? { ...storeItem, stock: storeItem.stock - 1 } : storeItem
      )));
      const newCoinsAmount = coins - item.price;
      setCoins(newCoinsAmount);
      const coinsRef = ref(db, COINS_DB_KEY);
      set(coinsRef, newCoinsAmount).catch(error => console.error("Error updating coins:", error));
      const storeRef = ref(db, STORE_DB_KEY);
      const updatedItems = storeItems.map(storeItem => (
        storeItem.id === item.id ? { ...storeItem, stock: storeItem.stock - 1 } : storeItem
      ));
      set(storeRef, {
        items: updatedItems,
        nextRestockTime: nextRestockTime?.toISOString(),
        lastRestockTime: new Date().toISOString(),
      }).catch(error => console.error("Error updating furniture store data:", error));
    } else {
      // Not enough coins or out of stock; surface message as needed (UI message not implemented)
      console.warn("Purchase failed: insufficient coins or out of stock");
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