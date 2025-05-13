import { useEffect, useState } from "react";
import { useInventory } from "../contexts/InventoryContext";
import type { InventoryItem } from "../contexts/InventoryContext";
import "./InventoryPage.css";

const categories = ["Walls", "Floors", "Ceilings", "Decor", "Overlays"];

export default function InventoryPage() {
  const { items, setRoomLayer, addDecorItem } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState("Walls");
  const [navHeight, setNavHeight] = useState(56); // Default nav bar height
  const [headerHeight, setHeaderHeight] = useState(80); // Default header height

  useEffect(() => {
    const nav = document.querySelector(".nav");
    const header = document.querySelector(".app-header");
    if (nav) setNavHeight(nav.clientHeight);
    if (header) setHeaderHeight(header.clientHeight);
  }, []);

  const handleEquip = (item: InventoryItem) => {
    if (["floor", "wall", "ceiling"].includes(item.type)) {
      setRoomLayer(item.type as "floor" | "wall" | "ceiling", item.src);
    } else if (item.type === "backDecor" || item.type === "frontDecor") {
      addDecorItem("backDecor", { src: item.src, x: 100, y: 100 });
    } else if (item.type === "overlay") {
      setRoomLayer("overlay", item.src);
    }
  };

  const filteredItems = items.filter(item => {
    switch (selectedCategory) {
      case "Walls": return item.type === "wall";
      case "Floors": return item.type === "floor";
      case "Ceilings": return item.type === "ceiling";
      case "Decor": return item.type === "backDecor" || item.type === "frontDecor";
      case "Overlays": return item.type === "overlay";
      default: return true;
    }
  });

  return (
    <div 
      className="inventory-page" 
      style={{ paddingTop: `${headerHeight}px` }}
    >
      <h1>Inventory</h1>

      <div className="inventory-grid">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className="inventory-item" 
            onClick={() => handleEquip(item)}
          >
            <img src={item.src} alt={item.name} className="inventory-image" />
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      <div 
        className="inventory-tabs" 
        style={{ bottom: `${navHeight}px` }}
      >
        {categories.map(category => (
          <button 
            key={category} 
            className={`tab-button ${selectedCategory === category ? "active" : ""}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
