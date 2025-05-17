// src/components/PetRoom.tsx
import "./PetRoom.css";
import { useEffect } from "react";
import type { ToyInventoryItem } from "../types";

interface PetRoomProps {
  floor: string;
  wall: string;
  ceiling: string;
  trim?: string;
  decor: Array<{ src: string; x: number; y: number; width?: number; height?: number }>;
  overlay?: string;
  petImage: string;
  petPosition: number;
  moodPhrase?: string;
  activeToy?: ToyInventoryItem | string | null;
  isPlaying?: boolean;
  foodItem?: { src: string; position: number } | null;
  onFoodEaten?: () => void;
}

export default function PetRoom({ 
  floor, 
  wall, 
  ceiling, 
  trim, 
  decor, 
  overlay, 
  petImage, 
  petPosition, 
  moodPhrase, 
  activeToy, 
  isPlaying, 
  foodItem, 
  onFoodEaten 
}: PetRoomProps) {
  // Handle food eaten after it's displayed for a while
  useEffect(() => {
    if (foodItem && onFoodEaten) {
      const timer = setTimeout(() => {
        onFoodEaten();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [foodItem, onFoodEaten]);

  return (
    <div className="pet-room">
      {/* Behind Pet */}
      <img className="floor" src={floor} alt="Floor" />
      <img className="wall" src={wall} alt="Wall" />
      <img className="ceiling" src={ceiling} alt="Ceiling" />
      {trim && <img className="trim-layer" src={trim} alt="Trim" />}

      {decor.map((item, idx) => (
        <img
          key={`decor-${idx}`}
          className="decor"
          src={item.src}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.width ? `${item.width}%` : "auto",
            height: item.height ? `${item.height}%` : "auto",
          }}
          alt=""
        />
      ))}

      {/* Active toy display */}
      {activeToy && isPlaying && (
        <img 
          className="toy"
          src={typeof activeToy === 'string' 
               ? activeToy 
               : activeToy.src || '/assets/toys/ball.png'} 
          alt="Toy"
          style={{ left: `${petPosition - 5}%` }}
        />
      )}

      {/* Food item display */}
      {foodItem && (
        <img 
          className="food-item"
          src={foodItem.src}
          style={{ left: `${foodItem.position}%` }}
          alt="Food"
        />
      )}

      {/* Pet Layer */}
      <img 
        className={`pet-layer ${isPlaying ? 'playing' : ''}`}
        src={petImage}
        style={{ left: `${petPosition}%` }}
        alt="Pet"
      />

      {/* Mood phrase bubble */}
      {moodPhrase && (
        <div 
          className="pet-mood-bubble"
          style={{ left: `${petPosition}%` }}
        >
          <p>{moodPhrase}</p>
        </div>
      )}

      {overlay && (
        <img className="overlay" src={overlay} alt="Overlay" />
      )}
    </div>
  );
}
