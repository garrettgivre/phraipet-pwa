import { useInventory } from "../contexts/InventoryContext";
import "./InventoryPage.css";

export default function InventoryPage() {
  const { items, setRoomLayer } = useInventory();

  const handleEquip = (item: any) => {
    if (["floor", "wall", "ceiling"].includes(item.type)) {
      setRoomLayer(item.type, item.src);
    }
  };

  return (
    <div className="inventory-page">
      <h1>Inventory</h1>
      <div className="inventory-grid">
        {items.map((item) => (
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
    </div>
  );
}
