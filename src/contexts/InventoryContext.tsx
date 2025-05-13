import { createContext, useState, type ReactNode, useContext } from "react";

export type InventoryItem = {
  id: string;
  name: string;
  type: "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";
  src: string;
};

type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
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
};

const InventoryContext = createContext<{
  items: InventoryItem[];
  roomLayers: RoomLayers;
  setRoomLayer: (type: keyof RoomLayers, src: string) => void;
}>({
  items: defaultInventory,
  roomLayers: defaultLayers,
  setRoomLayer: () => {},
});

export const useInventory = () => useContext(InventoryContext);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items] = useState<InventoryItem[]>(defaultInventory);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultLayers);

  const setRoomLayer = (type: keyof RoomLayers, src: string) => {
    setRoomLayers((prev) => ({ ...prev, [type]: src }));
  };

  return (
    <InventoryContext.Provider value={{ items, roomLayers, setRoomLayer }}>
      {children}
    </InventoryContext.Provider>
  );
}
