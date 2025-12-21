// src/types.ts

// Defines the possible categories for a pet's needs.
export type Need = "hunger" | "happiness" | "cleanliness" | "affection" | "spirit";

// Represents the information for displaying a single need in the UI.
export interface NeedInfo {
  name: string;
  value: number;
  maxValue: number;
  color: string;
  need: Need;
  iconSrc: string;
  desc: string;
}

// Defines the structure for a pet object.
export interface Pet {
  id: string;
  name: string;
  type: string;
  hunger: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  spirit: number;
  lastNeedsUpdateTime: number;
  image: string;
  affectionGainedToday?: number;
  lastAffectionGainDate?: string;
}

// Defines the structure for a user object
export interface User {
  id: string;
  username: string;
  currency: number;
  joinDate: string;
  lastLoginDate: string;
}

// Defines the structure for a decor item that can be placed in a room.
export interface RoomDecorItem {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;  // Added rotation property for furniture items
  position?: "front" | "back"; // Position relative to pet
  zone?: "FLOOR" | "WALL" | "CEILING"; // Zone in the room for better positioning
  relativeTo?: { // For maintaining position relative to another item
    itemSrc: string;
    offsetX: number;
    offsetY: number;
  } | null;
  flipped?: boolean; // Horizontal flip
  flippedV?: boolean; // Vertical flip
}

// Defines the types of decoration items available in the inventory.
export type DecorationItemType = "floor" | "wall" | "ceiling" | "trim" | "furniture" | "overlay";

// Defines the categories for food items.
export type FoodCategory = "Treat" | "Snack" | "LightMeal" | "HeartyMeal" | "Feast";

// MODIFIED: GroomingCategory restricted to the five main types for sub-tabs
export type GroomingCategory = "QuickFix" | "BasicKit" | "StandardSet" | "PremiumCare" | "LuxurySpa";

// ToyCategory names updated
export type ToyCategory = "Basic" | "Classic" | "Plushie" | "Gadget" | "Wonder";


// Base interface for all inventory items.
interface BaseInventoryItem {
  id: string;
  name: string;
  src: string;
  description?: string;
  price: number; // Price in coins
}

// Interface for decoration items as they appear in the inventory.
export interface DecorationInventoryItem extends BaseInventoryItem {
  itemCategory: "decoration";
  type: DecorationItemType;
}

// Interface for food items as they appear in the inventory.
export interface FoodInventoryItem extends BaseInventoryItem {
  itemCategory: "food";
  type: FoodCategory;
  hungerBoost: number;
  hungerRestored?: number; // Alias for hungerBoost for backward compatibility
  phrases: string[];
}

// Interface for grooming items as they appear in the inventory.
export interface GroomingInventoryItem extends BaseInventoryItem {
  itemCategory: "grooming";
  type: GroomingCategory;    // Uses the restricted GroomingCategory
  cleanlinessBoost: number;
  phrases: string[];
}

// ToyInventoryItem now uses the updated ToyCategory
export interface ToyInventoryItem extends BaseInventoryItem {
  itemCategory: "toy";
  type: ToyCategory;
  happinessBoost: number;
  description: string;
  phrases: string[]; // Array of phrases the pet says when playing with this toy
}

// A union type representing any item that can be in the inventory.
export type InventoryItem =
  | DecorationInventoryItem
  | FoodInventoryItem
  | GroomingInventoryItem
  | ToyInventoryItem;


// --- Types for Tiled Map Data Integration ---
export interface TiledProperty {
  name: string;
  type: string;
  value: unknown;
}
export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  gid?: number;
  visible: boolean;
  properties?: TiledProperty[];
  point?: boolean;
  ellipse?: boolean;
}
export interface TiledLayer {
  id?: number;
  name: string;
  type: "objectgroup" | "imagelayer" | "tilelayer";
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  objects?: TiledObject[];
  image?: string;
  properties?: TiledProperty[];
}
export interface TiledMapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  properties?: TiledProperty[];
  orientation?: string;
  renderorder?: string;
  version?: string | number;
  tiledversion?: string;
  infinite?: boolean;
  nextlayerid?: number;
  nextobjectid?: number;
  type?: string;
}
export interface AppHotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  route: string;
  iconSrc?: string;
  iconSize?: number;
  radius?: number;
  type?: 'location' | 'building';
  width?: number;    // Original width from Tiled
  height?: number;   // Original height from Tiled
  origX?: number;    // Original X position from Tiled
  origY?: number;    // Original Y position from Tiled
}

export interface RoomLayers {
  floor: string;
  wall: string;
  ceiling: string;
  trim: string;
  frontDecor: RoomDecorItem[];
  backDecor: RoomDecorItem[];
  decor: RoomDecorItem[];
  overlay: string;
}
