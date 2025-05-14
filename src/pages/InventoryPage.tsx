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
  // Add more unique decoration items
];

const defaultFoodItems: FoodInventoryItem[] = [
  { id: "food-apple-treat", name: "Apple Slice", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/apple_slice.png", description: "A crunchy apple slice." },
  { id: "food-cookie-snack", name: "Cookie", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/cookie.png", description: "A tasty cookie." },
  // Add more unique food items
];

const defaultCleaningItems: CleaningInventoryItem[] = [
    { id: "clean-wet-wipe", name: "Wet Wipe", itemCategory: "cleaning", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/cleaning/wet_wipe.png", description: "A quick wipe down." },
    { id: "clean-soap-bar", name: "Soap Bar", itemCategory: "cleaning", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/cleaning/soap_bar.png", description: "Basic but effective." },
    // Add more unique cleaning items
];

const defaultToyItems: ToyInventoryItem[] = [
    { id: "toy-rubber-ball", name: "Rubber Ball", itemCategory: "toy", type: "ChewToy", happinessBoost: 10, src: "/assets/toys/rubber_ball.png", description: "A bouncy classic." },
    { id: "toy-teddy-bear", name: "Teddy Bear", itemCategory: "toy", type: "Plushie", happinessBoost: 15, src: "/assets/toys/teddy_bear.png", description: "Soft and cuddly." },
    // Add more unique toy items
];

// Combine all default items into one list for the inventory.
const defaultAllItems: InventoryItem[] = [
    ...defaultDecorationItems, 
    ...defaultFoodItems,
    ...defaultCleaningItems,
    ...defaultToyItems
];

// Default state for the room layers.
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
  consumeItem: (itemId: string) => void; // Ensured this is correctly named
}

// Creates the context with default values.
const InventoryContext = createContext<InventoryContextType>({
  items: defaultAllItems,
  roomLayers: defaultRoomLayersData,
  roomLayersLoading: true, 
  setRoomLayer: () => { console.warn("setRoomLayer called on default context"); },
  addDecorItem: () => { console.warn("addDecorItem called on default context"); },
  consumeItem: () => { console.warn("consumeItem called on default context"); }, // Correctly named here
});

// Custom hook to easily consume the InventoryContext.
export const useInventory = () => useContext(InventoryContext);

// Provider component that wraps parts of the app needing access to inventory state.
export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultRoomLayersData);
  const [roomLayersLoading, setRoomLayersLoading] = useState<boolean>(true);

  // Effect to load room layers from Firebase on component mount.
  useEffect(() => {
    setRoomLayersLoading(true); 
    const roomRef = ref(db, "roomLayers/sharedRoom");
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        // Ensure all properties exist, defaulting if necessary to prevent runtime errors
        setRoomLayers({
          floor: firebaseData.floor || defaultRoomLayersData.floor,
          wall: firebaseData.wall || defaultRoomLayersData.wall,
          ceiling: firebaseData.ceiling || defaultRoomLayersData.ceiling,
          backDecor: Array.isArray(firebaseData.backDecor) ? firebaseData.backDecor : [],
          frontDecor: Array.isArray(firebaseData.frontDecor) ? firebaseData.frontDecor : [],
          overlay: firebaseData.overlay || defaultRoomLayersData.overlay,
        });
      } else {
        // If no data in Firebase, ensure local state is (or remains) default
        setRoomLayers(defaultRoomLayersData);
        // Optionally, write default layers to Firebase if they don't exist upon first load
        // set(roomRef, defaultRoomLayersData).catch(err => console.error("Failed to set default room layers:", err));
      }
      setRoomLayersLoading(false); // Data processing finished
    }, (error) => {
      console.error("Error fetching roomLayers from Firebase:", error);
      setRoomLayers(defaultRoomLayersData); // Fallback to default on error
      setRoomLayersLoading(false); 
    });
    return () => unsubscribe(); // Cleanup Firebase listener on unmount
  }, []);

  // Function to save the current room layers configuration to Firebase.
  const saveRoomToFirebase = (updatedLayers: RoomLayers) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    set(roomRef, updatedLayers).catch(err => console.error("Failed to save room layers to Firebase:", err));
  };

  // Function to update a specific layer of the room (floor, wall, ceiling, overlay).
  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "overlay", src: string) => {
    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  // Function to add a decor item to either the back or front decor layers.
  const addDecorItem = (type: "backDecor" | "frontDecor", decor: RoomDecorItem) => {
    const updatedLayers = {
      ...roomLayers,
      [type]: [...(roomLayers[type] || []), decor], // Ensure the array exists before spreading
    };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  // Generic function to remove an item from the client-side inventory list after consumption.
  // In a full game, this would also update the user's persistent inventory in Firebase.
  const consumeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    console.log(`Item ${itemId} consumed from local list.`);
    // TODO: Add logic here to remove the item from the user's inventory in Firebase
  };

  // Provide the state and functions to children components.
  return (
    <InventoryContext.Provider value={{ 
      items, 
      roomLayers, 
      roomLayersLoading, 
      setRoomLayer, 
      addDecorItem, 
      consumeItem // Ensure this is passed
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
