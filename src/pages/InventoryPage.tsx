// src/pages/InventoryPage.tsx
import { useState } from "react";
import Inventory from "../components/Inventory";
import PetRoom from "../components/PetRoom";
import "./InventoryPage.css";

type DecorItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

type InventoryItem = {
  id: string;
  name: string;
  type: "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";
  src: string;
};

const sampleInventory: InventoryItem[] = [
  { id: "floor1", name: "Wood Floor", type: "floor", src: "/assets/floors/wood.png" },
  { id: "wall1", name: "Starry Wall", type: "wall", src: "/assets/walls/starry.png" },
  { id: "ceiling1", name: "Sky Ceiling", type: "ceiling", src: "/assets/ceilings/sky.png" },
  { id: "decor1", name: "Plant", type: "backDecor", src: "/assets/decorations/plant.png" },
  { id: "decor2", name: "Rug", type: "frontDecor", src: "/assets/decorations/rug.png" },
  { id: "overlay1", name: "Sparkles", type: "overlay", src: "/assets/overlays/sparkles.png" }
];

export default function InventoryPage() {
  const [roomLayers, setRoomLayers] = useState({
    floor: "/assets/floors/wood.png",
    wall: "/assets/walls/starry.png",
    ceiling: "/assets/ceilings/sky.png",
    backDecor: [] as DecorItem[],
    frontDecor: [] as DecorItem[],
    overlay: ""
  });

  const handleEquip = (item: InventoryItem) => {
    if (item.type === "backDecor" || item.type === "frontDecor") {
      setRoomLayers((prev) => ({
        ...prev,
        [item.type]: [...prev[item.type], { src: item.src, x: 100, y: 200 }]
      }));
    } else {
      setRoomLayers((prev) => ({ ...prev, [item.type]: item.src }));
    }
  };

  return (
    <div className="inventoryPage">
      <h2 className="inventoryTitle">Inventory</h2>

      <Inventory items={sampleInventory} onEquip={handleEquip} />

      <h3 className="previewTitle">Room Preview</h3>
      <PetRoom roomLayers={roomLayers} />
    </div>
  );
}
