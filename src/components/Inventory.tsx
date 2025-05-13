import { useState } from "react";
import "./InventoryPage.css";

type InventoryItem = {
  id: string;
  name: string;
  type: "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";
  src: string;
};

const inventoryItems: InventoryItem[] = [
  { id: "classicFloor", name: "Classic Floor", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "classicWall", name: "Classic Wall", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "classicCeiling", name: "Classic Ceiling", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },
  { id: "scienceFloor", name: "Science Floor", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "scienceWall", name: "Science Wall", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "scienceCeiling", name: "Science Ceiling", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },
];

export default function InventoryPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (itemId: string) => {
    setSelected(itemId);
    // TODO: Add code to apply this selection globally if needed
  };

  return (
    <div className="inventory-page">
      <h1>Inventory</h1>
      <div className="inventory-grid">
        {inventoryItems.map((item) => (
          <div 
            key={item.id} 
            className={`inventory-item ${selected === item.id ? "selected" : ""}`} 
            onClick={() => handleSelect(item.id)}
          >
            <img src={item.src} alt={item.name} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
