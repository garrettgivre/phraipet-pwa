import { createContext, useState, useEffect, type ReactNode, useContext } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";

export type InventoryItem = {
  id: string;
  name: string;
  type: "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";
  src: string;
  colorOptions?: { label: string; src: string }[]; // New color options field
};


export type DecorItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
  backDecor: DecorItem[];
  frontDecor: DecorItem[];
  overlay: string;
};

const defaultInventory: InventoryItem[] = [
  // Classic Theme
  { id: "classic-floor", name: "Classic Floor", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "classic-wall", name: "Classic Wall", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "classic-ceiling", name: "Classic Ceiling", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },

  // Science Lab Theme
  { id: "science-floor", name: "Science Floor", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "science-wall", name: "Science Wall", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "science-ceiling", name: "Science Ceiling", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },

  // Aero Theme
  { id: "aero-floor", name: "Aero Floor", type: "floor", src: "/assets/floors/aero-floor.png" },
  { id: "aero-wall", name: "Aero Wall", type: "wall", src: "/assets/walls/aero-wall.png" },
  { id: "aero-ceiling", name: "Aero Ceiling", type: "ceiling", src: "/assets/ceilings/aero-ceiling.png" },

  // Candy Theme
  { id: "candy-floor", name: "Candy Floor", type: "floor", src: "/assets/floors/candy-floor.png" },
  { id: "candy-wall", name: "Candy Wall", type: "wall", src: "/assets/walls/candy-wall.png" },
  { id: "candy-ceiling", name: "Candy Ceiling", type: "ceiling", src: "/assets/ceilings/candy-ceiling.png" },

  // Krazy Theme
  { id: "krazy-floor", name: "Krazy Floor", type: "floor", src: "/assets/floors/krazy-floor.png" },
  { id: "krazy-wall", name: "Krazy Wall", type: "wall", src: "/assets/walls/krazy-wall.png" },
  { id: "krazy-ceiling", name: "Krazy Ceiling", type: "ceiling", src: "/assets/ceilings/krazy-ceiling.png" },
];

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
  setRoomLayer: (type: keyof RoomLayers, src: string) => void;
  addDecorItem: (type: "backDecor" | "frontDecor", decor: DecorItem) => void;
}>({
  items: defaultInventory,
  roomLayers: defaultLayers,
  setRoomLayer: () => {},
  addDecorItem: () => {},
});

export const useInventory = () => useContext(InventoryContext);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items] = useState<InventoryItem[]>(defaultInventory);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultLayers);

  // Load room layers from Firebase on startup
  useEffect(() => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomLayers(snapshot.val());
      }
    });
  }, []);

  const saveToFirebase = (updatedLayers: RoomLayers) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    set(roomRef, updatedLayers);
  };

  const setRoomLayer = (type: keyof RoomLayers, src: string) => {
    if (type === "backDecor" || type === "frontDecor") return; // Use addDecorItem for these instead

    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveToFirebase(updatedLayers);
  };

  const addDecorItem = (type: "backDecor" | "frontDecor", decor: DecorItem) => {
    const updatedLayers = {
      ...roomLayers,
      [type]: [...roomLayers[type], decor],
    };
    setRoomLayers(updatedLayers);
    saveToFirebase(updatedLayers);
  };

  return (
    <InventoryContext.Provider value={{ items, roomLayers, setRoomLayer, addDecorItem }}>
      {children}
    </InventoryContext.Provider>
  );
}
