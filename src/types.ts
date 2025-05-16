// src/types.ts

// Defines the possible categories for a pet's needs.
export type Need = "hunger" | "happiness" | "cleanliness" | "affection" | "spirit";

// Represents the information for displaying a single need in the UI.
export type NeedInfo = {
  need: Need;
  iconSrc: string;
  value: number;
  desc: string;
};

// Defines the structure for a pet object.
export interface Pet {
  hunger: number;
  happiness: number;
  cleanliness: number; // This stat remains 'cleanliness' for the pet
  affection: number;
  spirit: number;
  image: string;
  lastNeedsUpdateTime?: number;
  affectionGainedToday?: number;
  lastAffectionGainDate?: string;
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

// Interface for grooming items as they appear in the inventory.
export interface GroomingInventoryItem extends BaseInventoryItem {
  itemCategory: "grooming";
  type: GroomingCategory;    // Uses the restricted GroomingCategory
  cleanlinessBoost: number;
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
  value: any;
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
  type: "objectgroup" | "imagelayer" | "tilelayer" | string;
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
}

export interface RoomLayers {
  floor: string;
  wall: string;
  ceiling: string;
  backDecor: RoomDecorItem[];
  frontDecor: RoomDecorItem[];
  overlay: string;
}
