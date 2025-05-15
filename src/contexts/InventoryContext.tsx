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
  // Classic Theme
  { id: "deco-classic-floor", name: "Classic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "deco-classic-wall", name: "Classic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "deco-classic-ceiling", name: "Classic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },
  
  // Science Lab Theme
  { id: "deco-science-floor", name: "Science Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "deco-science-wall", name: "Science Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "deco-science-ceiling", name: "Science Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },
  
  // Aero Theme
  { id: "deco-aero-floor", name: "Aero Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/aero-floor.png" },
  { id: "deco-aero-wall", name: "Aero Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/aero-wall.png" },
  { id: "deco-aero-ceiling", name: "Aero Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/aero-ceiling.png" },

  // Candy Theme
  { id: "deco-candy-floor", name: "Candy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/candy-floor.png" },
  { id: "deco-candy-wall", name: "Candy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/candy-wall.png" },
  { id: "deco-candy-ceiling", name: "Candy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/candy-ceiling.png" },

  // Krazy Theme
  { id: "deco-krazy-floor", name: "Krazy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/krazy-floor.png" },
  { id: "deco-krazy-wall", name: "Krazy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/krazy-wall.png" },
  { id: "deco-krazy-ceiling", name: "Krazy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/krazy-ceiling.png" },
  
  // Example Decor Items
  { id: "deco-plant-1", name: "Potted Plant", itemCategory: "decoration", type: "backDecor", src: "/assets/decor/plant_1.png", description: "A lovely green plant." },
  { id: "deco-lamp-1", name: "Floor Lamp", itemCategory: "decoration", type: "frontDecor", src: "/assets/decor/lamp_1.png", description: "Lights up the room." },
  
  // Example Overlay
  { id: "deco-rainy-overlay", name: "Rainy Window", itemCategory: "decoration", type: "overlay", src: "/assets/overlays/rainy_window.png", description: "A cozy rainy day view."}
];

const defaultFoodItems: FoodInventoryItem[] = [
  // New items from screenshot (placeholders removed)
  { id: "food-kefir-lightmeal", name: "Kefir", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-dairy-lightmeal-kefir.png", description: "A fermented milk drink." },
  { id: "food-milk-lightmeal", name: "Milk", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-dairy-lightmeal-milk.png", description: "A refreshing glass of milk." },
  { id: "food-cheese-snack", name: "Cheese Slice", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-cheese.png", description: "A tasty slice of cheese." },
  { id: "food-cottagecheese-snack", name: "Cottage Cheese", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-cottagecheese.png", description: "Creamy cottage cheese." },
  { id: "food-whey-snack", name: "Whey Drink", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-whey.png", description: "A protein-rich whey drink." },
  { id: "food-yogurt-snack", name: "Yogurt Cup", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-yogurt.png", description: "A cup of creamy yogurt." },
  { id: "food-juice-lightmeal", name: "Orange Juice", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-drink-lightmeal-juice.png", description: "Fresh orange juice." },
  { id: "food-soda-lightmeal", name: "Soda Pop", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-drink-lightmeal-soda.png", description: "A fizzy soda pop." },
  { id: "food-tea-treat", name: "Cup of Tea", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-drink-treat-tea.png", description: "A warm cup of tea." },
  { id: "food-watermelonsalad-feast", name: "Watermelon Salad", itemCategory: "food", type: "Feast", hungerRestored: 60, src: "/assets/food/food-fruit-feast-watermelonsalad.png", description: "A refreshing watermelon salad." },
  { id: "food-applespb-lightmeal", name: "Apple Slices & PB", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-fruit-lightmeal-applesliceswithpeanutbutter.png", description: "Apple slices with peanut butter." },
  { id: "food-peachcobbler-lightmeal", name: "Peach Cobbler", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-fruit-lightmeal-peachcobbler.png", description: "Warm peach cobbler." },
  { id: "food-granolabar-lightmeal", name: "Granola Bar", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-snacks-lightmeal-granolabar.png", description: "A chewy granola bar." },
  { id: "food-chips-snack", name: "Potato Chips", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-chips.png", description: "Crispy potato chips." },
  { id: "food-pretzels-snack", name: "Pretzels", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-pretzels.png", description: "Salty pretzels." },
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
  consumeItem: (itemId: string) => void; // This is the function InventoryPage expects
}

// Creates the context with default values.
const InventoryContext = createContext<InventoryContextType>({
  items: defaultAllItems,
  roomLayers: defaultRoomLayersData,
  roomLayersLoading: true, 
  setRoomLayer: () => { console.warn("setRoomLayer called on default context"); },
  addDecorItem: () => { console.warn("addDecorItem called on default context"); },
  consumeItem: (itemId: string) => { console.warn(`consumeItem(${itemId}) called on default context`); }, 
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
  const consumeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    console.log(`Item ${itemId} consumed from local list.`);
    // Future: Add logic here to remove the item from the user's inventory in Firebase
  };

  // Provide the state and functions to children components.
  return (
    <InventoryContext.Provider value={{ 
      items, 
      roomLayers, 
      roomLayersLoading, 
      setRoomLayer, 
      addDecorItem, 
      consumeItem // Ensure consumeItem is included in the provided value
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
