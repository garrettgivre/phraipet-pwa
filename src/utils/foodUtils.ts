import { foodDescriptionMap } from '../data/foodDescriptions';
import type { FoodInventoryItem } from '../types';

/**
 * Enhances food items with detailed descriptions from our database
 * @param foodItems Array of food inventory items to enhance
 * @returns Array of enhanced food items with detailed descriptions
 */
export function enhanceFoodItemsWithDescriptions(foodItems: FoodInventoryItem[]): FoodInventoryItem[] {
  return foodItems.map(item => {
    // Check if we have a detailed description for this item
    const detailedDescription = foodDescriptionMap[item.name];
    
    if (detailedDescription) {
      return {
        ...item,
        description: detailedDescription
      };
    }
    
    // Return the original item if no detailed description is found
    return item;
  });
}

/**
 * Gets the food category based on hunger value
 * @param hungerValue The hunger value of the food item
 * @returns The category name
 */
export function getFoodCategoryFromHungerValue(hungerValue: number): string {
  if (hungerValue <= 10) return 'Treat';
  if (hungerValue <= 15) return 'Snack';
  if (hungerValue <= 30) return 'Light Meal';
  if (hungerValue <= 45) return 'Hearty Meal';
  return 'Feast';
}

/**
 * Gets a color for the hunger display
 * @param hungerValue The hunger value to get color for
 * @returns The hex color code
 */
export function getHungerDisplayColor(hungerValue: number): string {
  if (hungerValue <= 10) return '#ff5252'; // red for treats
  if (hungerValue <= 15) return '#ff9800'; // orange for snacks
  if (hungerValue <= 30) return '#2196f3'; // blue for light meals
  if (hungerValue <= 45) return '#4caf50'; // green for hearty meals
  return '#9c27b0'; // purple for feasts
} 