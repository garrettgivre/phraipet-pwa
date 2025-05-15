// src/types.ts
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
export interface Pet {
  hunger: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  spirit: number;
  image: string;
  lastNeedsUpdateTime?: number;
  affectionGainedToday?: number;
  lastAffectionGainDate?: string;
}

// Type for decor items placed in a room
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

// Cleaning item categories
export type CleaningCategory = "QuickFix" | "BasicKit" | "StandardSet" | "PremiumCare" | "LuxurySpa";

// Toy item categories
export type ToyCategory = "ChewToy" | "Plushie" | "PuzzleToy" | "ActivityCenter" | "RoboticPal";


// Base Inventory Item
interface BaseInventoryItem {
  id: string;
  name: string;
  src: string; 
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
  type: FoodCategory;
  hungerRestored: number;
}

// Cleaning Inventory Item
export interface CleaningInventoryItem extends BaseInventoryItem {
  itemCategory: "cleaning";
  type: CleaningCategory;
  cleanlinessBoost: number; 
}

// Toy Inventory Item
export interface ToyInventoryItem extends BaseInventoryItem {
  itemCategory: "toy";
  type: ToyCategory;
  happinessBoost: number; 
}

// Union type for all inventory items
export type InventoryItem = 
  | DecorationInventoryItem 
  | FoodInventoryItem
  | CleaningInventoryItem
  | ToyInventoryItem;


// --- Types for Tiled Map Data Integration ---

// Represents a custom property from a Tiled object
export interface TiledProperty {
  name: string;
  type: string; // "string", "int", "float", "bool", "color", "file", "object"
  value: any;
}

// Represents an object (like a hotspot) from an object layer in Tiled
export interface TiledObject {
  id: number;         // Unique ID assigned by Tiled
  name: string;       // Name given to the object in Tiled editor
  type: string;       // Type string, if assigned in Tiled
  x: number;          // X-coordinate (top-left)
  y: number;          // Y-coordinate (top-left) - Note: Tiled Y is often top of object, not baseline
  width: number;      // Width of the object (often 0 for point objects)
  height: number;     // Height of the object (often 0 for point objects)
  rotation: number;
  gid?: number;       // Tile GID if it's a tile object
  visible: boolean;
  properties?: TiledProperty[]; // Array of custom properties
  point?: boolean;    // True if it's a point object
  ellipse?: boolean;  // True if it's an ellipse object
}

// Represents a layer from a Tiled map
export interface TiledLayer {
  id?: number;
  name: string;        // Name of the layer (e.g., "Hotspots", "Background")
  type: "objectgroup" | "imagelayer" | "tilelayer" | string; // Layer type
  visible: boolean;
  opacity: number;
  x: number;           // Layer offset X
  y: number;           // Layer offset Y
  objects?: TiledObject[]; // For "objectgroup" layers
  image?: string;      // For "imagelayer" layers (path to image)
  properties?: TiledProperty[]; // Layer custom properties
}

// Represents the overall structure of a Tiled map JSON file
export interface TiledMapData {
  width: number;        // Map width in tiles
  height: number;       // Map height in tiles
  tilewidth: number;    // Width of a single tile in pixels
  tileheight: number;   // Height of a single tile in pixels
  layers: TiledLayer[]; // Array of layers in the map
  properties?: TiledProperty[]; // Map custom properties
  orientation?: string;
  renderorder?: string;
  version?: string | number;
  tiledversion?: string;
  infinite?: boolean;
  nextlayerid?: number;
  nextobjectid?: number;
  type?: string; // "map"
}

// Simplified hotspot structure for use in the application
export interface AppHotspot {
  id: string;         // Unique string ID (e.g., from "id_string" custom property)
  name: string;       // Display name (from "name" custom property or object name)
  x: number;          // X-coordinate for placement on your canvas
  y: number;          // Y-coordinate
  route: string;      // Navigation route (from "route" custom property)
  iconSrc?: string;   // Optional path to an icon image (from "iconSrc" custom property)
}
