// src/types.ts

// Defines the possible categories for a pet's needs.
export type Need = "hunger" | "happiness" | "cleanliness" | "affection" | "spirit";

// Represents the information for displaying a single need in the UI.
export type NeedInfo = {
  need: Need;          // The category of the need.
  emoji: string;       // Emoji representing the need.
  value: number;       // Current numerical value of the need (e.g., 0-120).
  desc: string;        // Textual description of the current need state (e.g., "Famished").
};

// Defines the structure for a pet object.
// This is used for both local state and Firebase storage.
export interface Pet {
  hunger: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  spirit: number;
  image: string;
  lastNeedsUpdateTime?: number;    // Optional: Timestamp of the last time needs were calculated and updated.
  affectionGainedToday?: number; // Optional: Tracks how much affection has been gained on the current day.
  lastAffectionGainDate?: string;  // Optional: The date (e.g., "YYYY-MM-DD") of the last affection gain.
}

// Defines the structure for a decor item that can be placed in a room.
export type RoomDecorItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

// Defines the types of decoration items available in the inventory.
export type DecorationItemType = "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";

// Defines the categories for food items.
export type FoodCategory = "Treat" | "Snack" | "LightMeal" | "HeartyMeal" | "Feast";

// Defines the categories for cleaning items.
export type CleaningCategory = "QuickFix" | "BasicKit" | "StandardSet" | "PremiumCare" | "LuxurySpa";

// Defines the categories for toy items.
export type ToyCategory = "ChewToy" | "Plushie" | "PuzzleToy" | "ActivityCenter" | "RoboticPal";


// Base interface for all inventory items.
interface BaseInventoryItem {
  id: string;
  name: string;
  src: string; 
  description?: string;
}

// Interface for decoration items as they appear in the inventory.
export interface DecorationInventoryItem extends BaseInventoryItem {
  itemCategory: "decoration";
  type: DecorationItemType;
  colorOptions?: { label: string; src: string }[];
}

// Interface for food items as they appear in the inventory.
export interface FoodInventoryItem extends BaseInventoryItem {
  itemCategory: "food";
  type: FoodCategory;
  hungerRestored: number;
}

// Interface for cleaning items as they appear in the inventory.
export interface CleaningInventoryItem extends BaseInventoryItem {
  itemCategory: "cleaning";
  type: CleaningCategory;
  cleanlinessBoost: number; 
}

// Interface for toy items as they appear in the inventory.
export interface ToyInventoryItem extends BaseInventoryItem {
  itemCategory: "toy";
  type: ToyCategory;
  happinessBoost: number; 
}

// A union type representing any item that can be in the inventory.
export type InventoryItem = 
  | DecorationInventoryItem 
  | FoodInventoryItem
  | CleaningInventoryItem
  | ToyInventoryItem;
