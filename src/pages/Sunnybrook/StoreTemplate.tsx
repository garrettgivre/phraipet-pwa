import React from 'react';
import { useCoins } from "../../contexts/CoinsContext";
import type { FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "../../types";

export type StoreItemWithStock = (FoodInventoryItem | ToyInventoryItem | GroomingInventoryItem) & {
  stock: number;
};

export interface StoreTemplateProps {
  title: string;
  imagePath: string;
  storeItems: StoreItemWithStock[];
  onPurchase: (item: StoreItemWithStock) => void;
  nextRestockTime: Date | null;
  isLoading: boolean;
}

const StoreTemplate: React.FC<StoreTemplateProps> = ({
  title,
  imagePath,
  storeItems,
  onPurchase,
  nextRestockTime,
  isLoading
}) => {
  const { coins } = useCoins();

  return (
    <div className="store-template">
      <h1>{title}</h1>
      <img src={imagePath} alt={title} className="store-image" />
      <div className="store-items">
        {storeItems.map((item) => (
          <div key={item.id} className="store-item">
            <img src={item.src} alt={item.name} />
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <p className="price">{item.price} coins</p>
            <button
              onClick={() => onPurchase(item)}
              disabled={coins < item.price || item.stock <= 0}
            >
              {item.stock <= 0 ? 'Out of Stock' : 'Purchase'}
            </button>
          </div>
        ))}
      </div>
      {nextRestockTime && (
        <p className="restock-time">
          Next restock: {nextRestockTime.toLocaleString()}
        </p>
      )}
      {isLoading && <p>Loading...</p>}
    </div>
  );
};

export default StoreTemplate; 