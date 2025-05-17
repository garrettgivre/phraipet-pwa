import { useState, useEffect } from 'react';
import './FoodItem.css';

interface FoodItemProps {
  src: string;
  position: number;
  onEaten: () => void;
}

export default function FoodItem({ src, position, onEaten }: FoodItemProps) {
  const [biteStage, setBiteStage] = useState(0);
  const [isEating, setIsEating] = useState(false);

  useEffect(() => {
    if (isEating) {
      const interval = setInterval(() => {
        setBiteStage(prev => {
          if (prev >= 3) {
            clearInterval(interval);
            onEaten();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isEating, onEaten]);

  const startEating = () => {
    if (!isEating) {
      setIsEating(true);
    }
  };

  return (
    <div 
      className={`food-item ${isEating ? 'eating' : ''} ${biteStage > 0 ? `bite-${biteStage}` : ''} ${biteStage >= 3 ? 'eaten' : ''}`}
      style={{ left: `${position}%` }}
      onClick={startEating}
    >
      <img src={src} alt="Food" />
    </div>
  );
} 