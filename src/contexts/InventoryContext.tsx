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
  { id: "classicFloor", name: "Classic Floor", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "classicWall", name: "Classic Wall", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "classicCeiling", name: "Classic Ceiling", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },
  { id: "scienceFloor", name: "Science Floor", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "scienceWall", name: "Science Wall", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "scienceCeiling", name: "Science Ceiling", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },
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
