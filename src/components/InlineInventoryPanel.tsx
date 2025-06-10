import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import type { 
  InventoryItem, 
  FoodInventoryItem, 
  GroomingInventoryItem, 
  ToyInventoryItem,
  FoodCategory,
  GroomingCategory,
  ToyCategory,
  Pet
} from '../types';
import './InlineInventoryPanel.css';

const mainCategories = ["Food", "Grooming", "Toys"] as const;
type MainCategory = (typeof mainCategories)[number];

const foodSubCategories: FoodCategory[] = [
  "Treat", "Snack", "LightMeal", "HeartyMeal", "Feast",
];

const groomingSubCategories: GroomingCategory[] = [
  "QuickFix", "BasicKit", "StandardSet", "PremiumCare", "LuxurySpa",
];

const toySubCategories: ToyCategory[] = [
  "Basic", "Classic", "Plushie", "Gadget", "Wonder",
];

interface InlineInventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
  onFeedPet: (item: FoodInventoryItem) => void;
  onGroomPet: (item: GroomingInventoryItem) => void;
  onPlayWithToy: (item: ToyInventoryItem) => void;
  initialCategory?: MainCategory;
  initialSubCategory?: string;
}

export default function InlineInventoryPanel({ 
  isOpen, 
  onClose, 
  pet,
  onFeedPet,
  onGroomPet,
  onPlayWithToy,
  initialCategory = "Food",
  initialSubCategory
}: InlineInventoryPanelProps) {
  const { consumeItem, getFilteredItems } = useInventory();
  
  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory>(initialCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(() => {
    if (initialSubCategory) return initialSubCategory;
    if (initialCategory === "Food") return foodSubCategories[0];
    if (initialCategory === "Grooming") return groomingSubCategories[0];
    if (initialCategory === "Toys") return toySubCategories[0];
    return foodSubCategories[0];
  });

  // Update selected categories when initial props change
  useEffect(() => {
    if (isOpen) {
      setSelectedMainCategory(initialCategory);
      if (initialSubCategory) {
        setSelectedSubCategory(initialSubCategory);
      } else {
        // Set default subcategory for the category
        if (initialCategory === "Food") setSelectedSubCategory(foodSubCategories[0]);
        else if (initialCategory === "Grooming") setSelectedSubCategory(groomingSubCategories[0]);
        else if (initialCategory === "Toys") setSelectedSubCategory(toySubCategories[0]);
      }
    }
  }, [isOpen, initialCategory, initialSubCategory]);

  const handleMainCategoryChange = useCallback((category: MainCategory) => {
    setSelectedMainCategory(category);
    if (category === "Food") setSelectedSubCategory(foodSubCategories[0]);
    else if (category === "Grooming") setSelectedSubCategory(groomingSubCategories[0]);
    else if (category === "Toys") setSelectedSubCategory(toySubCategories[0]);
  }, []);

  const handleSubCategoryChange = useCallback((category: string) => {
    setSelectedSubCategory(category);
  }, []);

  const handleItemClick = useCallback((item: InventoryItem) => {
    if (!pet) {
      console.warn("Pet data not loaded! Cannot use item.");
      return;
    }

    if (item.itemCategory === "food") {
      onFeedPet(item as FoodInventoryItem);
      consumeItem(item.id);
    } else if (item.itemCategory === "grooming") {
      onGroomPet(item as GroomingInventoryItem);
      consumeItem(item.id);
    } else if (item.itemCategory === "toy") {
      onPlayWithToy(item as ToyInventoryItem);
      consumeItem(item.id);
    }
    
    onClose(); // Close panel after using item
  }, [pet, onFeedPet, onGroomPet, onPlayWithToy, consumeItem, onClose]);

  const filteredItems = useMemo(() => 
    getFilteredItems(selectedMainCategory, selectedSubCategory),
    [getFilteredItems, selectedMainCategory, selectedSubCategory]
  );

  const currentSubcategories = useMemo(() => {
    if (selectedMainCategory === "Food") return foodSubCategories;
    if (selectedMainCategory === "Grooming") return groomingSubCategories;
    if (selectedMainCategory === "Toys") return toySubCategories;
    return [];
  }, [selectedMainCategory]);

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (!isOpen) return null;

  return (
    <div className="inline-inventory-panel">
      {/* Sliding inventory panel */}
      <div className="inventory-panel">
        {/* Close button positioned above the panel */}
        <button className="close-inventory-btn" onClick={onClose} title="Close Inventory">
          ✕
        </button>
        
        <div className="inventory-header">
          <h3>Inventory</h3>
          <div className="category-tabs">
            {mainCategories.map(category => (
              <button
                key={category}
                className={selectedMainCategory === category ? 'active' : ''}
                onClick={() => handleMainCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="subcategory-tabs">
            {currentSubcategories.map(categoryValue => (
              <button
                key={categoryValue}
                className={selectedSubCategory === categoryValue ? 'active' : ''}
                onClick={() => handleSubCategoryChange(categoryValue)}
              >
                {capitalizeFirstLetter(categoryValue)}
              </button>
            ))}
          </div>
        </div>

        <div className="inventory-grid">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="inventory-item"
                onClick={() => handleItemClick(item)}
                title={item.description || item.name}
              >
                <img src={item.src} alt={item.name} />
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  {item.itemCategory === "food" && (
                    <span className="item-effect">Hunger +{(item as FoodInventoryItem).hungerRestored}</span>
                  )}
                  {item.itemCategory === "grooming" && (
                    <span className="item-effect">Clean +{(item as GroomingInventoryItem).cleanlinessBoost}</span>
                  )}
                  {item.itemCategory === "toy" && (
                    <span className="item-effect">Happy +{(item as ToyInventoryItem).happinessBoost}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">No items in this category.</p>
          )}
        </div>
      </div>
    </div>
  );
} 