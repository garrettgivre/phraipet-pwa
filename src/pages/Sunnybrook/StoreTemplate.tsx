import React from "react";
import BuildingTemplate from "./BuildingTemplate";
import type { DecorationInventoryItem, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem, InventoryItem } from "../../types";
import { useCoins } from "../../contexts/CoinsContext";
import "../../pages/InventoryPage.css";
import "./StoreTemplate.css";

// Define a union type of all possible inventory items
export type StoreItem = FoodInventoryItem | GroomingInventoryItem | ToyInventoryItem | DecorationInventoryItem;

// Define an interface that extends inventory items with stock
export interface StoreItemWithStock {
  id: string;
  name: string;
  src: string;
  description?: string;
  itemCategory: string;
  price: number;
  type: string;
  stock: number;
  // Optional type-specific properties
  hungerRestored?: number;
  cleanlinessBoost?: number;
  happinessBoost?: number;
}

export interface StoreTemplateProps {
  title: string;
  imagePath: string;
  storeItems: StoreItemWithStock[];
  onPurchase: (item: StoreItemWithStock) => void;
  nextRestockTime: Date | null;
  isLoading?: boolean;
  onForceRestock?: () => void;
}

// Helper function to capitalize first letter of category names
const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  return string
    .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
    .replace(/^./, str => str.toUpperCase());  // Capitalize first letter
};

// Calculate time until next restock
export const getTimeUntilRestock = (nextRestockTime: Date | null): string => {
  if (!nextRestockTime) return 'Unknown';
  
  const now = new Date();
  const timeDiff = nextRestockTime.getTime() - now.getTime();
  
  if (timeDiff <= 0) return 'Soon';
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
};

// Component to display a purchasable item with stock
const ShopItem = ({ 
  item, 
  onPurchase 
}: { 
  item: StoreItemWithStock, 
  onPurchase: (item: StoreItemWithStock) => void 
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
        
        {item.itemCategory === "food" && item.hungerRestored && (
          <p className="shop-item-effect">Hunger +{item.hungerRestored}</p>
        )}
        {item.itemCategory === "grooming" && item.cleanlinessBoost && (
          <p className="shop-item-effect">Clean +{item.cleanlinessBoost}</p>
        )}
        {item.itemCategory === "toy" && item.happinessBoost && (
          <p className="shop-item-effect">Happy +{item.happinessBoost}</p>
        )}
        
        <div className="shop-item-price">
          {formatPrice(item.price)}
        </div>
        <div className="shop-item-stock">
          Stock: {item.stock}
        </div>
        <button 
          className="shop-buy-button" 
          onClick={() => onPurchase(item)}
          disabled={item.stock <= 0}
        >
          Buy
        </button>
      </div>
    </div>
  );
};

export default function StoreTemplate({ 
  title, 
  imagePath, 
  storeItems, 
  onPurchase, 
  nextRestockTime, 
  isLoading,
  onForceRestock
}: StoreTemplateProps) {
  const { coins } = useCoins();
  const restockMessage = nextRestockTime 
    ? `Next restock in: ${getTimeUntilRestock(nextRestockTime)}`
    : '';

  return (
    <BuildingTemplate
      title={title}
      imagePath={imagePath}
    >
      <div className="store-container" style={{ marginBottom: '200px' }}>
        <div className="store-header">
          <h2>Welcome to {title}</h2>
        </div>

        <div className="store-restock-info">
          <p>{restockMessage}</p>
          {onForceRestock && (
            <button 
              className="store-force-restock-button"
              onClick={onForceRestock}
            >
              Force Restock
            </button>
          )}
        </div>

        <div className="store-items-container">
          {isLoading ? (
            <p className="store-message">Loading inventory...</p>
          ) : storeItems.length > 0 ? (
            storeItems.map(item => (
              <ShopItem 
                key={item.id} 
                item={item} 
                onPurchase={onPurchase} 
              />
            ))
          ) : (
            <p className="store-empty-message">
              Out of Stock. Come back {nextRestockTime ? getTimeUntilRestock(nextRestockTime) : 'soon'}!
            </p>
          )}
        </div>
      </div>
    </BuildingTemplate>
  );
} 