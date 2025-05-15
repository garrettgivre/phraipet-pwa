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
  y: number;          // Y-coordinate (top-left)
  width: number;      // Width of the object
  height: number;     // Height of the object
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
  x: number;          // X-coordinate for placement on your canvas (center of hotspot)
  y: number;          // Y-coordinate for placement on your canvas (center of hotspot)
  route: string;      // Navigation route (from "route" custom property)
  iconSrc?: string;   // Optional path to an icon image (from "iconSrc" custom property)
}
