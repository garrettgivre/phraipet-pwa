import { useState, useEffect, useCallback } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../firebase";
import { useInventory } from "../../contexts/InventoryContext";
import { useCoins } from "../../contexts/CoinsContext";
import StoreTemplate, { type StoreItemWithStock } from "./StoreTemplate";
import type { InventoryItem, ToyInventoryItem } from "../../types";

interface ToyStoreData {
  stock?: StoreItemWithStock[];
  nextRestockTime?: string;
}

export default function SBToyStore() {
  const { items } = useInventory();
  const { coins, updateCoins } = useCoins();
  const [storeItems, setStoreItems] = useState<StoreItemWithStock[]>([]);
  const [nextRestockTime, setNextRestockTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  const getEligibleItems = useCallback((allItems: InventoryItem[]): ToyInventoryItem[] => {
    return allItems.filter((item): item is ToyInventoryItem => {
      if (item.itemCategory !== "toy") return false;
      if (!["Classic", "Basic", "Plushie"].includes(item.type)) return false;
      if (item.id === "toys-classic-fun-flatsqueaker") return false;
      const idText = item.id.toLowerCase();
      const descText = (item.description || "").toLowerCase();
      if (!idText.includes("fun") && !idText.includes("exciting") && !descText.includes("fun") && !descText.includes("exciting")) return false;
      return true;
    });
  }, []);

  const generateToyStock = useCallback((existingItems: StoreItemWithStock[]): StoreItemWithStock[] => {
    const eligibleItems = getEligibleItems(items);
    if (eligibleItems.length === 0) {
      console.error("No eligible toy items found in inventory");
      return [];
    }
    const existingStock = existingItems.filter(item => item.stock > 0);
    const availableItems = eligibleItems.filter(item => !existingStock.some(existing => existing.id === item.id));
    const neededItems = Math.max(0, 4 - existingStock.length);
    const selectedItems: StoreItemWithStock[] = [...existingStock];
    for (let i = 0; i < neededItems && availableItems.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      const selectedItem = availableItems[randomIndex];
      selectedItems.push({
        ...selectedItem,
        stock: Math.floor(Math.random() * 3) + 1
      });
      availableItems.splice(randomIndex, 1);
    }
    return selectedItems;
  }, [items, getEligibleItems]);

  const getNextRestockTime = useCallback(() => {
    const now = new Date();
    const nextRestock = new Date(now);
    nextRestock.setDate(now.getDate() + 3);
    nextRestock.setHours(7, 0, 0, 0);
    return nextRestock;
  }, []);

  const handleRestock = useCallback(async (storeRefObj: ReturnType<typeof ref>, currentStock: StoreItemWithStock[] = []) => {
    const newStock = generateToyStock(currentStock);
    if (newStock.length === 0) {
      console.error("Failed to generate new stock");
      return;
    }
    const newRestockTime = getNextRestockTime();
    await set(storeRefObj, { stock: newStock, nextRestockTime: newRestockTime.toISOString() });
    setStoreItems(newStock);
    setNextRestockTime(newRestockTime);
  }, [generateToyStock, getNextRestockTime]);

  useEffect(() => {
    const storeRefObj = ref(db, "stores/toyStore");
    const initialStock = generateToyStock([]);
    const initialRestockTime = getNextRestockTime();
    set(storeRefObj, { stock: initialStock, nextRestockTime: initialRestockTime.toISOString() })
      .then(() => {
        setStoreItems(initialStock);
        setNextRestockTime(initialRestockTime);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error resetting toy store:", error);
        setIsLoading(false);
      });

    const unsubscribe = onValue(storeRefObj, (snapshot) => {
      const raw = snapshot.val() as unknown;
      if (raw && typeof raw === 'object') {
        const data = raw as ToyStoreData;
        const nextStr = data.nextRestockTime;
        const nextRestock = nextStr ? new Date(nextStr) : null;
        const now = new Date();
        if (nextRestock && now >= nextRestock) {
          void handleRestock(storeRefObj, Array.isArray(data.stock) ? data.stock : []);
        } else {
          setStoreItems(Array.isArray(data.stock) ? data.stock : []);
          setNextRestockTime(nextRestock);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [generateToyStock, getNextRestockTime, handleRestock]);

  const handlePurchase = async (item: StoreItemWithStock) => {
    if (coins < item.price) {
      setPurchaseMessage("Not enough coins!");
      setTimeout(() => setPurchaseMessage(null), 3000);
      return;
    }
    try {
      const storeRefObj = ref(db, "stores/toyStore");
      const updatedItems = storeItems
        .map(storeItem => (storeItem.id === item.id ? { ...storeItem, stock: storeItem.stock - 1 } : storeItem))
        .filter(storeItem => storeItem.stock > 0);
      await Promise.all([
        set(storeRefObj, { stock: updatedItems, nextRestockTime: nextRestockTime?.toISOString() }),
        updateCoins(-item.price)
      ]);
      setStoreItems(updatedItems);
      setPurchaseMessage(`Successfully purchased ${item.name}!`);
      setTimeout(() => setPurchaseMessage(null), 3000);
    } catch (error) {
      console.error("Error purchasing item:", error);
      setPurchaseMessage("Failed to purchase item. Please try again.");
      setTimeout(() => setPurchaseMessage(null), 3000);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <StoreTemplate
        title="Sunnybrook Toy Store"
        imagePath="/locations/sbtoy-horizontal.png"
        storeItems={storeItems}
        onPurchase={handlePurchase}
        nextRestockTime={nextRestockTime}
        isLoading={isLoading}
      />
      <div style={{ height: '200px' }} />
      {purchaseMessage && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 1000 }}>
          {purchaseMessage}
        </div>
      )}
    </div>
  );
} 