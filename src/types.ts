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
  hunger: number;                 // Current hunger level.
  happiness: number;              // Current happiness level.
  cleanliness: number;            // Current cleanliness level.
  affection: number;              // Current affection level.
  spirit: number;                 // Current spirit level (often derived from other needs).
  image: string;                  // Path to the pet's current image.
  lastNeedsUpdateTime?: number;    // Optional: Timestamp of the last time needs were calculated and updated.
                                  // Used for calculating decay based on time elapsed.
  affectionGainedToday?: number; // Optional: Tracks how much affection has been gained on the current day.
                                  // Used for daily affection gain caps.
  lastAffectionGainDate?: string;  // Optional: The date (e.g., "YYYY-MM-DD") of the last affection gain.
                                  // Used to reset affectionGainedToday daily.
}

// Defines the structure for a decor item that can be placed in a room.
// These are typically part of the RoomLayers state.
export type RoomDecorItem = {
  src: string;      // Path to the decor item's image.
  x: number;        // X-coordinate for placement (pixels or percentage).
  y: number;        // Y-coordinate for placement.
  width?: number;   // Optional: Width of the decor item.
  height?: number;  // Optional: Height of the decor item.
};

// Defines the types of decoration items available in the inventory.
export type DecorationItemType = "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";

// Defines the categories for food items.
export type FoodCategory = "Treat" | "Snack" | "LightMeal" | "HeartyMeal" | "Feast";

// Base interface for all inventory items.
interface BaseInventoryItem {
  id: string;           // Unique identifier for the item.
  name: string;         // Display name of the item.
  src: string;          // Path to the item's image/icon.
  description?: string; // Optional: A short description of the item.
}

// Interface for decoration items as they appear in the inventory.
export interface DecorationInventoryItem extends BaseInventoryItem {
  itemCategory: "decoration"; // Discriminator for the type of inventory item.
  type: DecorationItemType;   // Specific type of decoration (e.g., "wall", "floor").
  colorOptions?: { label: string; src: string }[]; // Optional: Different color variants.
}

// Interface for food items as they appear in the inventory.
export interface FoodInventoryItem extends BaseInventoryItem {
  itemCategory: "food";      // Discriminator for the type of inventory item.
  type: FoodCategory;        // Specific category of food (e.g., "Treat", "Snack").
  hungerRestored: number;    // How many hunger points this food item restores.
}

// A union type representing any item that can be in the inventory.
export type InventoryItem = DecorationInventoryItem | FoodInventoryItem;
