export interface Pet {
  id: string;
  name: string;
  type: string;
  hunger: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  spirit: number;
  lastFed: number;
  lastPlayed: number;
  lastGroomed: number;
  lastPet: number;
  lastSpirit: number;
  needs: NeedInfo[];
  image: string;
  lastNeedsUpdateTime: number;
  affectionGainedToday: number;
  lastAffectionGainDate: string;
}

export interface NeedInfo {
  name: string;
  iconSrc: string;
  value: number;
  desc: string;
  maxValue: number;
  color: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  itemCategory: "toy" | "grooming" | "food";
  type: string;
  src: string;
  description: string;
  price: number;
  phrases: string[];
}

export interface FoodInventoryItem extends InventoryItem {
  itemCategory: "food";
  type: "LightMeal" | "Snack" | "Treat" | "Feast" | "HeartyMeal";
  hungerRestored: number;
  happinessBoost: number;
}

export interface GroomingInventoryItem extends InventoryItem {
  itemCategory: "grooming";
  type: "BasicKit" | "LuxurySpa" | "PremiumCare" | "StandardSet" | "QuickFix";
  cleanlinessBoost: number;
}

export interface ToyInventoryItem extends InventoryItem {
  itemCategory: "toy";
  type: "Basic" | "Premium" | "Luxury";
  happinessBoost: number;
}

export type StoreItemWithStock = (FoodInventoryItem | GroomingInventoryItem | ToyInventoryItem) & {
  stock: number;
};

export interface StoreTemplateProps {
  title: string;
  imagePath: string;
  storeItems: StoreItemWithStock[];
  onPurchase: (item: StoreItemWithStock) => void;
  nextRestockTime: Date | null;
  isLoading: boolean;
} 