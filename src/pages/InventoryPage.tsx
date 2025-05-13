import { useEffect, useState } from "react";
import { useInventory } from "../contexts/InventoryContext";
import type { InventoryItem } from "../contexts/InventoryContext";
import { calculateVisibleBounds } from "../utils/imageUtils";
import "./InventoryPage.css";

const categories = ["Walls", "Floors", "Ceilings", "Decor", "Overlays"];

export default function InventoryPage() {
  const { items, setRoomLayer, addDecorItem } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState("Walls");

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
    <div className="inventory-page">
      <h1>Inventory</h1>

      <div className="inventory-grid">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className="inventory-item" 
            onClick={() => handleEquip(item)}
          >
            <ZoomedImage src={item.src} alt={item.name} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      <div className="inventory-tabs">
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

function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    calculateVisibleBounds(src).then(bounds => {
      const scale = Math.min(64 / bounds.width, 64 / bounds.height);
      const offsetX = -bounds.x * scale;
      const offsetY = -bounds.y * scale;

      setStyle({
        transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
        transformOrigin: "top left",
      });
    });
  }, [src]);

  return <img src={src} alt={alt} className="inventory-image" style={style} />;
}
