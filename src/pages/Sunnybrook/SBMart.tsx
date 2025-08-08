import React, { useState, useCallback, useMemo } from "react";
import { useInventory } from "../../contexts/InventoryContext";
import { useDecoration } from "../../contexts/DecorationContext";
import BuildingTemplate from "./BuildingTemplate";
import type { DecorationInventoryItem, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "../../types";
import "../../pages/InventoryPage.css";
import "./SBMart.css";

const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  return string
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

const mainCategories = ["Food", "Grooming", "Toys", "Decorations"] as const;
type MainCategory = (typeof mainCategories)[number];

type PurchasableItem = FoodInventoryItem | GroomingInventoryItem | ToyInventoryItem | DecorationInventoryItem;

const ShopItem = ({ 
  item, 
  onPurchase 
}: { 
  item: PurchasableItem, 
  onPurchase: (item: PurchasableItem) => void 
}) => {
  const formatPrice = (price: number | string): string => {
    if (price === undefined || price === null) return 'Price unavailable';
    const numericPrice = typeof price === 'string' ? parseInt(price, 10) : price;
    if (Number.isNaN(numericPrice) || numericPrice <= 0) return 'Price unavailable';
    return `${numericPrice} coins`;
  };
  
  return (
    <div className="shop-item">
      <img src={item.src} alt={item.name} className="shop-item-image" />
      <div className="shop-item-info">
        <h3 className="shop-item-name">{item.name}</h3>
        <p className="shop-item-description">{item.description || "No description"}</p>
        {item.itemCategory === "food" && (
          <p className="shop-item-effect">Hunger +{item.hungerRestored}</p>
        )}
        {item.itemCategory === "grooming" && (
          <p className="shop-item-effect">Clean +{item.cleanlinessBoost}</p>
        )}
        {item.itemCategory === "toy" && (
          <p className="shop-item-effect">Happy +{item.happinessBoost}</p>
        )}
        <div className="shop-item-price">{formatPrice(item.price)}</div>
        <button className="shop-buy-button" onClick={() => onPurchase(item)}>Buy</button>
      </div>
    </div>
  );
};

export default function SBMart() {
  const { items } = useInventory();
  const { decorations } = useDecoration();
  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>("Food");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("Treat");
  const [coins, setCoins] = useState<number>(1000);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  const currentSubcategories = useMemo(() => {
    if (selectedMainCategory === "Food") {
      const foodTypes = [...new Set(items
        .filter(item => item.itemCategory === "food")
        .map(item => item.type))];
      return foodTypes;
    }
    if (selectedMainCategory === "Grooming") {
      const groomingTypes = [...new Set(items
        .filter(item => item.itemCategory === "grooming")
        .map(item => item.type))];
      return groomingTypes;
    }
    if (selectedMainCategory === "Toys") {
      const toyTypes = [...new Set(items
        .filter(item => item.itemCategory === "toy")
        .map(item => item.type))];
      return toyTypes;
    }
    if (selectedMainCategory === "Decorations") {
      const decorTypes = [...new Set(decorations.map(item => item.type))];
      return decorTypes;
    }
    return [] as string[];
  }, [selectedMainCategory, items, decorations]);

  const handleMainCategoryChange = useCallback((category: MainCategory) => {
    setSelectedMainCategory(category);
    if (category === "Food") setSelectedSubCategory("Treat");
    else if (category === "Grooming") setSelectedSubCategory("QuickFix");
    else if (category === "Toys") setSelectedSubCategory("Basic");
    else if (category === "Decorations") setSelectedSubCategory("floor");
  }, []);

  const handleSubCategoryChange = useCallback((category: string) => {
    setSelectedSubCategory(category);
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedMainCategory === "Food") {
      return items.filter(
        item => item.itemCategory === "food" && item.type === selectedSubCategory
      );
    }
    if (selectedMainCategory === "Grooming") {
      return items.filter(
        item => item.itemCategory === "grooming" && item.type === selectedSubCategory
      );
    }
    if (selectedMainCategory === "Toys") {
      return items.filter(
        item => item.itemCategory === "toy" && item.type === selectedSubCategory
      );
    }
    if (selectedMainCategory === "Decorations") {
      return decorations.filter(item => item.type === selectedSubCategory);
    }
    return [];
  }, [selectedMainCategory, selectedSubCategory, items, decorations]);

  const handlePurchase = useCallback((item: PurchasableItem) => {
    if (coins >= Number(item.price)) {
      setCoins(prev => prev - Number(item.price));
      setPurchaseMessage(`Successfully purchased ${item.name}!`);
      setTimeout(() => setPurchaseMessage(null), 3000);
      console.log(`Purchased: ${item.name} for ${item.price} coins`);
    } else {
      setPurchaseMessage("Not enough coins to make this purchase!");
      setTimeout(() => setPurchaseMessage(null), 3000);
    }
  }, [coins]);

  return (
    <BuildingTemplate
      title="Sunnybrook Mart"
      imagePath="/locations/sbmart-horizontal.png"
    >
      <div className="sb-mart-container">
        <div className="sb-mart-header">
          <h2>Welcome to Sunnybrook Mart</h2>
          <div className="sb-mart-coins">
            <img src="/assets/icons/coin.png" alt="Coins" className="coin-icon" />
            <span>{coins} coins</span>
          </div>
        </div>

        {purchaseMessage && (
          <div className="sb-mart-message">
            {purchaseMessage}
          </div>
        )}

        <div className="sb-mart-tabs">
          <div className="sb-mart-main-category-bar">
            {mainCategories.map(category => (
              <button
                key={category}
                className={`sb-mart-tab-button ${selectedMainCategory === category ? "active" : ""}`}
                onClick={() => handleMainCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="sb-mart-sub-category-bar">
            {currentSubcategories.map(category => (
              <button
                key={category}
                className={`sb-mart-tab-button ${selectedSubCategory === category ? "active" : ""}`}
                onClick={() => handleSubCategoryChange(category)}
              >
                {capitalizeFirstLetter(category)}
              </button>
            ))}
          </div>
        </div>

        <div className="sb-mart-items-container">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <ShopItem 
                key={item.id} 
                item={item as PurchasableItem} 
                onPurchase={handlePurchase} 
              />
            ))
          ) : (
            <p className="sb-mart-empty-message">No items available in this category.</p>
          )}
        </div>
      </div>
    </BuildingTemplate>
  );
}
