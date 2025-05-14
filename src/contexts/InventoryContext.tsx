// src/contexts/InventoryContext.tsx
import { createContext, useState, useEffect, type ReactNode, useContext } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type { 
  InventoryItem, 
  DecorationInventoryItem, 
  FoodInventoryItem, 
  CleaningInventoryItem,
  ToyInventoryItem,      
  RoomDecorItem 
} from "../types";

// This export is for compatibility if other files were importing DecorItem from here.
// It should ideally refer to RoomDecorItem if that's the intended shared type.
export type DecorItem = RoomDecorItem;

// Defines the structure of the layers that make up the pet's room.
type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
  backDecor: RoomDecorItem[];
  frontDecor: RoomDecorItem[];
  overlay: string;
};

// --- Sample Items (Ensure these match the types and have unique IDs) ---
const defaultDecorationItems: DecorationInventoryItem[] = [
  { id: "deco-classic-floor", name: "Classic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "deco-classic-wall", name: "Classic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "deco-classic-ceiling", name: "Classic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },
  { id: "deco-science-floor", name: "Science Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "deco-science-wall", name: "Science Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "deco-science-ceiling", name: "Science Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },
];

const defaultFoodItems: FoodInventoryItem[] = [
  { id: "food-apple-treat", name: "Apple Slice", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/apple_slice.png", description: "A crunchy apple slice." },
  { id: "food-cookie-snack", name: "Cookie", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/cookie.png", description: "A tasty cookie." },
  { id: "food-sandwich-light", name: "Sandwich", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/sandwich.png", description: "A simple sandwich." },
  { id: "food-steak-hearty", name: "Steak", itemCategory: "food", type: "HeartyMeal", hungerRestored: 45, src: "/assets/food/steak.png", description: "A juicy steak." },
  { id: "food-cake-feast", name: "Full Cake", itemCategory: "food", type: "Feast", hungerRestored: 60, src: "/assets/food/cake.png", description: "A whole cake to feast on!" },
];

const defaultCleaningItems: CleaningInventoryItem[] = [
    { id: "clean-wet-wipe", name: "Wet Wipe", itemCategory: "cleaning", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/cleaning/wet_wipe.png", description: "A quick wipe down." },
    { id: "clean-soap-bar", name: "Soap Bar", itemCategory: "cleaning", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/cleaning/soap_bar.png", description: "Basic but effective." },
    { id: "clean-shampoo-bottle", name: "Shampoo", itemCategory: "cleaning", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/cleaning/shampoo.png", description: "Leaves a fresh scent." },
    { id: "clean-grooming-kit", name: "Grooming Kit", itemCategory: "cleaning", type: "PremiumCare", cleanlinessBoost: 25, src: "/assets/cleaning/grooming_kit.png", description: "For a thorough clean." },
    { id: "clean-spa-day-pass", name: "Spa Day Pass", itemCategory: "cleaning", type: "LuxurySpa", cleanlinessBoost: 30, src: "/assets/cleaning/spa_pass.png", description: "The ultimate pampering!" },
];

const defaultToyItems: ToyInventoryItem[] = [
    { id: "toy-rubber-ball", name: "Rubber Ball", itemCategory: "toy", type: "ChewToy", happinessBoost: 10, src: "/assets/toys/rubber_ball.png", description: "A bouncy classic." },
    { id: "toy-teddy-bear", name: "Teddy Bear", itemCategory: "toy", type: "Plushie", happinessBoost: 15, src: "/assets/toys/teddy_bear.png", description: "Soft and cuddly." },
    { id: "toy-puzzle-box", name: "Puzzle Box", itemCategory: "toy", type: "PuzzleToy", happinessBoost: 20, src: "/assets/toys/puzzle_box.png", description: "Keeps the mind sharp." },
    { id: "toy-activity-tree", name: "Activity Tree", itemCategory: "toy", type: "ActivityCenter", happinessBoost: 25, src: "/assets/toys/cat_tree.png", description: "Hours of fun!" },
    { id: "toy-robot-mouse", name: "Robo-Mouse", itemCategory: "toy", type: "RoboticPal", happinessBoost: 30, src: "/assets/toys/robot_mouse.png", description: "An interactive friend!" },
];

const defaultAllItems: InventoryItem[] = [
    ...defaultDecorationItems, 
    ...defaultFoodItems,
    ...defaultCleaningItems,
    ...defaultToyItems
];

const defaultRoomLayersData: RoomLayers = { 
  floor: "/assets/floors/classic-floor.png",
  wall: "/assets/walls/classic-wall.png",
  ceiling: "/assets/ceilings/classic-ceiling.png",
  backDecor: [],
  frontDecor: [],
  overlay: "",
};

// Defines the shape of the data and functions provided by the InventoryContext.
interface InventoryContextType {
  items: InventoryItem[];
  roomLayers: RoomLayers;
  roomLayersLoading: boolean; 
  setRoomLayer: (type: "floor" | "wall" | "ceiling" | "overlay", src: string) => void;
  addDecorItem: (type: "backDecor" | "frontDecor", decor: RoomDecorItem) => void;
  consumeItem: (itemId: string) => void; // CRITICAL: consumeItem is defined here
}

// Creates the context with default values.
const InventoryContext = createContext<InventoryContextType>({
  items: defaultAllItems,
  roomLayers: defaultRoomLayersData,
  roomLayersLoading: true, 
  setRoomLayer: () => { console.warn("setRoomLayer called on default context"); },
  addDecorItem: () => { console.warn("addDecorItem called on default context"); },
  consumeItem: (itemId: string) => { console.warn(`consumeItem(${itemId}) called on default context`); }, // CRITICAL: Default implementation
});

export const useInventory = () => useContext(InventoryContext);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultRoomLayersData);
  const [roomLayersLoading, setRoomLayersLoading] = useState<boolean>(true);

  useEffect(() => {
    setRoomLayersLoading(true); 
    const roomRef = ref(db, "roomLayers/sharedRoom");
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        setRoomLayers({
          floor: firebaseData.floor || defaultRoomLayersData.floor,
          wall: firebaseData.wall || defaultRoomLayersData.wall,
          ceiling: firebaseData.ceiling || defaultRoomLayersData.ceiling,
          backDecor: Array.isArray(firebaseData.backDecor) ? firebaseData.backDecor : [],
          frontDecor: Array.isArray(firebaseData.frontDecor) ? firebaseData.frontDecor : [],
          overlay: firebaseData.overlay || defaultRoomLayersData.overlay,
        });
      } else {
        setRoomLayers(defaultRoomLayersData);
      }
      setRoomLayersLoading(false); 
    }, (error) => {
      console.error("Error fetching roomLayers from Firebase:", error);
      setRoomLayers(defaultRoomLayersData); 
      setRoomLayersLoading(false); 
    });
    return () => unsubscribe(); 
  }, []);

  const saveRoomToFirebase = (updatedLayers: RoomLayers) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    set(roomRef, updatedLayers).catch(err => console.error("Failed to save room layers to Firebase:", err));
  };

  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "overlay", src: string) => {
    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const addDecorItem = (type: "backDecor" | "frontDecor", decor: RoomDecorItem) => {
    const updatedLayers = {
      ...roomLayers,
      [type]: [...(roomLayers[type] || []), decor], 
    };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const consumeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    console.log(`Item ${itemId} consumed from local list.`);
    // TODO: Add logic here to remove the item from the user's inventory in Firebase
  };

  return (
    <InventoryContext.Provider value={{ 
      items, 
      roomLayers, 
      roomLayersLoading, 
      setRoomLayer, 
      addDecorItem, 
      consumeItem // CRITICAL: consumeItem is provided here
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
