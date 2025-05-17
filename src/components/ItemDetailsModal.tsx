import React, { useCallback } from 'react';
import './ItemDetailsModal.css';
import type { FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem, InventoryItem } from '../types';
import { getFoodDescription, getFoodItemByName } from '../data/foodDescriptions';
import { getHungerDisplayColor } from '../utils/foodUtils';

interface ItemDetailsModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onUse: (item: InventoryItem) => void;
  onDiscard: (item: InventoryItem) => void;
  onClose: () => void;
}

// Get meal size for food items (more descriptive)
const getMealSize = (item: FoodInventoryItem) => {
  const categorySizes: Record<string, string> = {
    'Treat': 'Treat',
    'Snack': 'Snack',
    'LightMeal': 'Light Meal',
    'HeartyMeal': 'Hearty Meal',
    'Feast': 'Feast'
  };
  
  return categorySizes[item.type] || item.type;
};

export default function ItemDetailsModal({ 
  isOpen, 
  item, 
  onUse, 
  onDiscard, 
  onClose 
}: ItemDetailsModalProps) {
  if (!isOpen || !item) return null;

  // Handler for clicks on the overlay
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click was directly on the overlay (not on its children)
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // For food items, try to get the detailed description from our food database
  const getEnhancedDescription = (item: InventoryItem): string => {
    if (item.itemCategory === 'food') {
      // Try to match by name
      return getFoodDescription(item.name);
    }
    // For other item types, use the item's description or a default
    return item.description || "No description available.";
  };

  // For food items, try to get additional info like category
  const getFoodInfo = (item: FoodInventoryItem) => {
    const foodData = getFoodItemByName(item.name);
    if (foodData) {
      return {
        category: foodData.category,
        mealSize: foodData.mealSize
      };
    }
    // Default values
    return {
      category: capitalizeFirstLetter(item.type),
      mealSize: getMealSize(item)
    };
  };

  // Helper to capitalize category names that might be in camelCase
  const capitalizeFirstLetter = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
      .replace(/^./, str => str.toUpperCase());  // Capitalize first letter
  };

  const handleUse = () => {
    if (item) {
      onUse(item);
    }
  };

  const handleDiscard = () => {
    if (item) {
      onDiscard(item);
    }
  };

  // For food items, get enhanced info
  let foodInfo = undefined;
  if (item.itemCategory === 'food') {
    foodInfo = getFoodInfo(item as FoodInventoryItem);
  }

  return (
    <div className="item-details-overlay" onClick={handleOverlayClick}>
      <div className="item-details-modal portrait-layout">
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        
        <div className="item-details-content">
          {/* Name at the top */}
          <h2 className="item-name">{item.name}</h2>
          
          {/* Image below name - larger size */}
          <div className="item-image-container">
            <img src={item.src} alt={item.name} className="item-details-image" />
          </div>
          
          {/* Description below image */}
          <div className="item-description">
            {getEnhancedDescription(item)}
          </div>
          
          {/* Stats below description */}
          <div className="item-info">
            {item.itemCategory === 'food' && (
              <div className="item-stats">
                <div className="item-stat"><strong>Category:</strong> {foodInfo?.category || capitalizeFirstLetter((item as FoodInventoryItem).type)}</div>
                <div className="item-stat"><strong>Meal Size:</strong> {foodInfo?.mealSize || getMealSize(item as FoodInventoryItem)}</div>
                <div className="item-stat">
                  <strong>Hunger Boost:</strong> 
                  <span style={{ 
                    color: getHungerDisplayColor((item as FoodInventoryItem).hungerRestored),
                    fontWeight: 'bold'
                  }}>
                    +{(item as FoodInventoryItem).hungerRestored}
                  </span>
                </div>
              </div>
            )}
            
            {item.itemCategory === 'grooming' && (
              <div className="item-stats">
                <div className="item-stat"><strong>Category:</strong> {capitalizeFirstLetter((item as GroomingInventoryItem).type)}</div>
                <div className="item-stat"><strong>Cleanliness Boost:</strong> +{(item as GroomingInventoryItem).cleanlinessBoost}</div>
              </div>
            )}
            
            {item.itemCategory === 'toy' && (
              <div className="item-stats">
                <div className="item-stat"><strong>Category:</strong> {capitalizeFirstLetter((item as ToyInventoryItem).type)}</div>
                <div className="item-stat"><strong>Happiness Boost:</strong> +{(item as ToyInventoryItem).happinessBoost}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Buttons at the bottom */}
        <div className="item-action-buttons">
          <button className="use-button" onClick={handleUse}>Use</button>
          <button className="discard-button" onClick={handleDiscard}>Discard</button>
        </div>
      </div>
    </div>
  );
} 