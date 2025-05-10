// src/components/Inventory.tsx
import "./Inventory.css";

type InventoryItem = {
  id: string;
  name: string;
  type: "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";
  src: string;
};

export default function Inventory({
  items,
  onEquip
}: {
  items: InventoryItem[];
  onEquip: (item: InventoryItem) => void;
}) {
  return (
    <div className="inventory">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="inventory-item" 
          onClick={() => onEquip(item)}
        >
          <img src={item.src} alt={item.name} />
          <p>{item.name}</p>
        </div>
      ))}
    </div>
  );
}
