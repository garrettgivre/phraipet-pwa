// Define all the possible pet needs
export type Need = "hunger" | "happiness" | "cleanliness" | "affection" | "spirit";

// Individual need info with description for UI purposes
export type NeedInfo = {
  need: Need;
  emoji: string;
  value: number;
  desc: string;
};

// The Pet object structure stored in Firebase and state
export type Pet = {
  hunger: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  spirit: number;
  image: string;
};

// Type for decor items placed in a room (e.g., in RoomLayers)
export type RoomDecorItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

// Decoration item types (for inventory items)
export type DecorationItemType = "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";

// Food item categories
export type FoodCategory = "Treat" | "Snack" | "LightMeal" | "HeartyMeal" | "Feast";

// Base Inventory Item
interface BaseInventoryItem {
  id: string;
  name: string;
  src: string; // Path to the item's image
  description?: string;
}

// Decoration Inventory Item
export interface DecorationInventoryItem extends BaseInventoryItem {
  itemCategory: "decoration";
  type: DecorationItemType;
  colorOptions?: { label: string; src: string }[];
}

// Food Inventory Item
export interface FoodInventoryItem extends BaseInventoryItem {
  itemCategory: "food";
  type: FoodCategory; // Treat, Snack, etc.
  hungerRestored: number;
}

// Union type for all inventory items
export type InventoryItem = DecorationInventoryItem | FoodInventoryItem;


// Example for future expansions:
// export type Player = {
//   id: string;
//   username: string;
//   phraipoints: number;
//   pets: Pet[];
//   inventory: InventoryItem[]; // Player-specific inventory
// };

// export type GameItem = { // More generic item for shops, etc.
//   id: string;
//   name: string;
//   category: string; // e.g., "food", "toy", "decoration"
//   effect?: (pet: Pet, setPet: Function) => void;
//   price?: number;
//   src: string;
// };