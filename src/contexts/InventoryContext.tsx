import { createContext, useState, useEffect, type ReactNode, useContext } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type { InventoryItem, DecorationInventoryItem, FoodInventoryItem, RoomDecorItem } from "../types"; // Corrected import

// This export makes RoomDecorItem available if other files were importing a 'DecorItem' from this context.
export type DecorItem = RoomDecorItem;

type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
  backDecor: RoomDecorItem[];
  frontDecor: RoomDecorItem[];
  overlay: string;
};

// Sample Decoration Items
const defaultDecorationItems: DecorationInventoryItem[] = [
  // Classic Theme
  { id: "classic-floor", name: "Classic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "classic-wall", name: "Classic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "classic-ceiling", name: "Classic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },

  // Science Lab Theme
  { id: "science-floor", name: "Science Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "science-wall", name: "Science Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "science-ceiling", name: "Science Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },
  
  // Aero Theme
  { id: "aero-floor", name: "Aero Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/aero-floor.png" },
  { id: "aero-wall", name: "Aero Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/aero-wall.png" },
  { id: "aero-ceiling", name: "Aero Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/aero-ceiling.png" },

  // Candy Theme
  { id: "candy-floor", name: "Candy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/candy-floor.png" },
  { id: "candy-wall", name: "Candy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/candy-wall.png" },
  { id: "candy-ceiling", name: "Candy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/candy-ceiling.png" },

  // Krazy Theme
  { id: "krazy-floor", name: "Krazy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/krazy-floor.png" },
  { id: "krazy-wall", name: "Krazy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/krazy-wall.png" },
  { id: "krazy-ceiling", name: "Krazy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/krazy-ceiling.png" },
];

// Sample Food Items
const defaultFoodItems: FoodInventoryItem[] = [
  { id: "apple-treat", name: "Apple Slice", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/apple_slice.png", description: "A crunchy apple slice." },
  { id: "cookie-snack", name: "Cookie", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/cookie.png", description: "A tasty cookie." },
  { id: "sandwich-light", name: "Sandwich", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/sandwich.png", description: "A simple sandwich." },
  { id: "steak-hearty", name: "Steak", itemCategory: "food", type: "HeartyMeal", hungerRestored: 45, src: "/assets/food/steak.png", description: "A juicy steak." },
  { id: "cake-feast", name: "Full Cake", itemCategory: "food", type: "Feast", hungerRestored: 60, src: "/assets/food/cake.png", description: "A whole cake to feast on!" },
];

const defaultAllItems: InventoryItem[] = [...defaultDecorationItems, ...defaultFoodItems];

const defaultLayers: RoomLayers = {
  floor: "/assets/floors/classic-floor.png",
  wall: "/assets/walls/classic-wall.png",
  ceiling: "/assets/ceilings/classic-ceiling.png",
  backDecor: [],
  frontDecor: [],
  overlay: "",
};

const InventoryContext = createContext<{
  items: InventoryItem[];
  roomLayers: RoomLayers;
  setRoomLayer: (type: "floor" | "wall" | "ceiling" | "overlay", src: string) => void;
  addDecorItem: (type: "backDecor" | "frontDecor", decor: RoomDecorItem) => void;
  consumeFoodItem: (itemId: string) => void;
}>({
  items: defaultAllItems,
  roomLayers: defaultLayers,
  setRoomLayer: () => {},
  addDecorItem: () => {},
  consumeFoodItem: () => {},
});

export const useInventory = () => useContext(InventoryContext);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultLayers);

  useEffect(() => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomLayers(snapshot.val());
      }
    });
  }, []);

  const saveRoomToFirebase = (updatedLayers: RoomLayers) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    set(roomRef, updatedLayers);
  };

  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "overlay", src: string) => {
    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const addDecorItem = (type: "backDecor" | "frontDecor", decor: RoomDecorItem) => {
    const updatedLayers = {
      ...roomLayers,
      [type]: [...roomLayers[type], decor],
    };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const consumeFoodItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  return (
    <InventoryContext.Provider value={{ items, roomLayers, setRoomLayer, addDecorItem, consumeFoodItem }}>
      {children}
    </InventoryContext.Provider>
  );
}