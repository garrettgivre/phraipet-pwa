import React, { useState, useCallback, useMemo } from "react";
import { useInventory } from "../../contexts/InventoryContext";
import { useDecoration } from "../../contexts/DecorationContext";
import BuildingTemplate from "./BuildingTemplate";
import type { DecorationInventoryItem, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "../../types";
import "../../pages/InventoryPage.css";
import "./SBMart.css";

// Helper function to capitalize first letter of category names
const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  return string
    .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
    .replace(/^./, str => str.toUpperCase());  // Capitalize first letter
};

// Main categories for the mart
const mainCategories = ["Food", "Grooming", "Toys", "Decorations"] as const;
type MainCategory = (typeof mainCategories)[number];

// Component to display a purchasable item
const ShopItem = ({ 
  item, 
  onPurchase 
}: { 
  item: FoodInventoryItem | GroomingInventoryItem | ToyInventoryItem | DecorationInventoryItem, 
  onPurchase: (item: any) => void 
}) => {
  // Format the price for display
  const formatPrice = (price: any): string => {
    if (price === undefined || price === null) {
      return 'Price unavailable';
    }
    
    // Handle both string and number types
    const numericPrice = typeof price === 'string' ? parseInt(price, 10) : price;
    
    // Check if it's a valid number
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return 'Price unavailable';
    }
    
    return `${numericPrice} coins`;
  };
  
  return (
    <div className="shop-item">
      <img src={item.src} alt={item.name} className="shop-item-image" />
      <div className="shop-item-info">
        <h3 className="shop-item-name">{item.name}</h3>
        <p className="shop-item-description">{item.description || "No description"}</p>
        
        {item.itemCategory === "food" && (
          <p className="shop-item-effect">Hunger +{(item as FoodInventoryItem).hungerRestored}</p>
        )}
        {item.itemCategory === "grooming" && (
          <p className="shop-item-effect">Clean +{(item as GroomingInventoryItem).cleanlinessBoost}</p>
        )}
        {item.itemCategory === "toy" && (
          <p className="shop-item-effect">Happy +{(item as ToyInventoryItem).happinessBoost}</p>
        )}
        
        <div className="shop-item-price">
          {formatPrice(item.price)}
        </div>
        <button className="shop-buy-button" onClick={() => onPurchase(item)}>
          Buy
        </button>
      </div>
    </div>
  );
};

export default function SBMart() {
  const { items } = useInventory();
  const { decorations } = useDecoration();
  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>("Food");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("Treat");
  const [coins, setCoins] = useState<number>(1000); // Starting amount
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  // Get appropriate subcategories based on main category
  const currentSubcategories = useMemo(() => {
    if (selectedMainCategory === "Food") {
      // Get unique food types
      const foodTypes = [...new Set(items
        .filter(item => item.itemCategory === "food")
        .map(item => (item as FoodInventoryItem).type))];
      return foodTypes;
    }
    if (selectedMainCategory === "Grooming") {
      // Get unique grooming types
      const groomingTypes = [...new Set(items
        .filter(item => item.itemCategory === "grooming")
        .map(item => (item as GroomingInventoryItem).type))];
      return groomingTypes;
    }
    if (selectedMainCategory === "Toys") {
      // Get unique toy types
      const toyTypes = [...new Set(items
        .filter(item => item.itemCategory === "toy")
        .map(item => (item as ToyInventoryItem).type))];
      return toyTypes;
    }
    if (selectedMainCategory === "Decorations") {
      // Get unique decoration types
      const decorTypes = [...new Set(decorations.map(item => item.type))];
      return decorTypes;
    }
    return [];
  }, [selectedMainCategory, items, decorations]);

  // Set default subcategory when main category changes
  const handleMainCategoryChange = useCallback((category: MainCategory) => {
    setSelectedMainCategory(category);
    // Set first subcategory as default
    if (category === "Food") setSelectedSubCategory("Treat");
    else if (category === "Grooming") setSelectedSubCategory("QuickFix");
    else if (category === "Toys") setSelectedSubCategory("Basic");
    else if (category === "Decorations") setSelectedSubCategory("floor");
  }, []);

  // Handle subcategory change
  const handleSubCategoryChange = useCallback((category: string) => {
    setSelectedSubCategory(category);
  }, []);

  // Get filtered items based on selected categories
  const filteredItems = useMemo(() => {
    if (selectedMainCategory === "Food") {
      return items.filter(
        item => item.itemCategory === "food" && 
        (item as FoodInventoryItem).type === selectedSubCategory
      );
    }
    if (selectedMainCategory === "Grooming") {
      return items.filter(
        item => item.itemCategory === "grooming" && 
        (item as GroomingInventoryItem).type === selectedSubCategory
      );
    }
    if (selectedMainCategory === "Toys") {
      return items.filter(
        item => item.itemCategory === "toy" && 
        (item as ToyInventoryItem).type === selectedSubCategory
      );
    }
    if (selectedMainCategory === "Decorations") {
      return decorations.filter(item => item.type === selectedSubCategory);
    }
    return [];
  }, [selectedMainCategory, selectedSubCategory, items, decorations]);

  // Handle item purchase
  const handlePurchase = useCallback((item: any) => {
    if (coins >= item.price) {
      // Deduct coins
      setCoins(prev => prev - item.price);
      // Show success message
      setPurchaseMessage(`Successfully purchased ${item.name}!`);
      // Clear message after 3 seconds
      setTimeout(() => setPurchaseMessage(null), 3000);

      // In a real implementation, this would add the item to the user's inventory
      console.log(`Purchased: ${item.name} for ${item.price} coins`);
    } else {
      // Show insufficient funds message
      setPurchaseMessage("Not enough coins to make this purchase!");
      // Clear message after 3 seconds
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
                item={item} 
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
