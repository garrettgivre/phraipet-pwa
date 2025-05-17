// src/components/PetRoom.tsx
import "./PetRoom.css";
import type { ToyInventoryItem } from "../types";
import FoodItem from "./FoodItem";

type DecorItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

interface PetRoomProps {
  floor: string;
  wall: string;
  ceiling: string;
  trim: string;
  decor: DecorItem[];
  overlay: string;
  petImage: string;
  petPosition: number;
  moodPhrase?: string;
  activeToy?: ToyInventoryItem | null;
  isPlaying?: boolean;
  isFacingRight?: boolean;
  foodItem?: { src: string; position: number } | null;
  onFoodEaten?: () => void;
  depthPosition?: number;
  isWaddling?: boolean;
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
  isFacingRight,
  foodItem,
  onFoodEaten,
  depthPosition = 0,
  isWaddling = false
}: PetRoomProps) {
  // Calculate scale based on depth position
  const getPetScale = () => {
    if (depthPosition < 0) {
      // When walking back, scale down slightly
      return 0.9 + (depthPosition * 0.05);
    } else if (depthPosition > 0) {
      // When walking forward, scale up slightly
      return 1 + (depthPosition * 0.05);
    }
    return 1;
  };

  return (
    <div className="pet-room">
      {/* Base Layers */}
      <img className="floor" src={floor} alt="Floor" />
      <img className="wall" src={wall} alt="Wall" />
      <img className="ceiling" src={ceiling} alt="Ceiling" />
      {trim && <img className="trim-layer" src={trim} alt="Trim" />}

      {/* Decor Items */}
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

      {/* Food Item */}
      {foodItem && (
        <FoodItem
          src={foodItem.src}
          position={foodItem.position}
          onEaten={onFoodEaten || (() => {})}
        />
      )}

      {/* Mood Bubble */}
      {moodPhrase && (
        <div 
          className="pet-mood-bubble"
          style={{
            left: `${petPosition}%`,
            transform: `translateX(-50%) scale(${getPetScale()})`
          }}
        >
          <p>{moodPhrase}</p>
        </div>
      )}

      {/* Active Toy */}
      {activeToy && (
        <img 
          src={activeToy.src} 
          alt={activeToy.name} 
          className={`toy ${isPlaying ? 'playing' : ''}`}
          style={{ 
            position: 'absolute', 
            left: `${petPosition - 15}%`,
            transform: `scale(${getPetScale()})`,
            zIndex: 8
          }}
        />
      )}

      {/* Pet Layer */}
      <img 
        className={`pet-layer ${isPlaying ? 'playing' : ''} ${isWaddling ? 'waddling' : ''}`}
        src={petImage}
        alt="Pet"
        style={{ 
          left: `${petPosition}%`,
          transform: `translateX(-50%) ${isFacingRight ? 'scaleX(-1)' : ''} scale(${getPetScale()})`,
          zIndex: 8
        }}
      />

      {/* Overlay */}
      {overlay && (
        <img className="overlay" src={overlay} alt="Overlay" />
      )}
    </div>
  );
}
