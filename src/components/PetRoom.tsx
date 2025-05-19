// src/components/PetRoom.tsx
import "./PetRoom.css";
import { useEffect, useState } from "react";
import type { ToyInventoryItem, RoomDecorItem } from "../types";
import FoodItem from "./FoodItem";

interface PetRoomProps {
  floor: string;
  wall: string;
  ceiling: string;
  trim?: string;
  decor?: RoomDecorItem[]; // Legacy support
  frontDecor?: RoomDecorItem[]; // Furniture to render in front of pet
  backDecor?: RoomDecorItem[]; // Furniture to render behind pet
  overlay?: string;
  petImage: string;
  petPosition: number;
  moodPhrase?: string;
  activeToy?: ToyInventoryItem | string | null;
  isPlaying?: boolean;
  isWalking?: boolean;
  isFacingRight?: boolean;
  foodItem?: { src: string; position: number; hungerRestored?: number } | null;
  onFoodEaten?: () => void;
  onFoodBite?: (biteNumber: number, hungerAmount: number) => void;
}

export default function PetRoom({ 
  floor, 
  wall, 
  ceiling, 
  trim, 
  decor = [], 
  frontDecor = [],
  backDecor = [],
  overlay, 
  petImage, 
  petPosition, 
  moodPhrase, 
  activeToy, 
  isPlaying, 
  isWalking,
  isFacingRight = false,
  foodItem, 
  onFoodEaten,
  onFoodBite
}: PetRoomProps) {
  const [isEating, setIsEating] = useState(false);

  // Handle eating animation state
  useEffect(() => {
    if (foodItem) {
      setIsEating(true);
    } else {
      setIsEating(false);
    }
  }, [foodItem]);

  // Determine which furniture to render behind and in front of pet
  const itemsBehindPet = [...backDecor];
  const itemsInFrontOfPet = [...frontDecor];

  // Handle legacy decor items (apply "position" property if it exists)
  if (decor && decor.length > 0) {
    decor.forEach(item => {
      if (item.position === "back") {
        itemsBehindPet.push(item);
      } else {
        // Default is "front" if not specified
        itemsInFrontOfPet.push(item);
      }
    });
  }

  return (
    <div className="pet-room">
      {/* Behind Pet */}
      <img className="floor" src={floor} alt="Floor" />
      <img className="wall" src={wall} alt="Wall" />
      <img className="ceiling" src={ceiling} alt="Ceiling" />
      {trim && <img className="trim-layer" src={trim} alt="Trim" />}

      {/* Items behind pet */}
      {itemsBehindPet.map((item, idx) => (
        <img
          key={`back-decor-${idx}`}
          className="decor"
          src={item.src}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.width ? `${item.width}px` : "auto",
            height: item.height ? `${item.height}px` : "auto",
            zIndex: 10 + idx // Ensure proper layering behind pet
          }}
          alt=""
        />
      ))}

      {/* Active toy display */}
      {activeToy && isPlaying && (
        <img 
          className="toy playing"
          src={typeof activeToy === 'string' 
               ? activeToy 
               : activeToy.src || '/assets/toys/ball.png'} 
          alt="Toy"
          style={{ 
            left: `${petPosition + (isFacingRight ? -12 : 12)}%`, 
            bottom: `22%`, /* Slightly higher than pet's 20% bottom */
            zIndex: 20
          }}
        />
      )}

      {/* Food item display - using the FoodItem component */}
      {foodItem && (
        <FoodItem 
          key={`food-${foodItem.src}`}
          src={foodItem.src}
          position={foodItem.position}
          hungerRestored={foodItem.hungerRestored || 15}
          onEaten={() => {
            if (onFoodEaten) onFoodEaten();
          }}
          onBite={onFoodBite}
        />
      )}

      {/* Pet Layer */}
      <img 
        className={`pet-layer ${isPlaying ? 'playing' : ''} ${isWalking ? 'waddling' : ''} ${isFacingRight ? 'flip' : ''} ${isEating ? 'pet-eating' : ''}`}
        src={petImage}
        style={{ left: `${petPosition}%`, zIndex: 30 }}
        alt="Pet"
      />

      {/* Items in front of pet */}
      {itemsInFrontOfPet.map((item, idx) => (
        <img
          key={`front-decor-${idx}`}
          className="decor"
          src={item.src}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.width ? `${item.width}px` : "auto",
            height: item.height ? `${item.height}px` : "auto",
            zIndex: 40 + idx // Ensure proper layering in front of pet
          }}
          alt=""
        />
      ))}

      {/* Mood phrase bubble */}
      {moodPhrase && (
        <div 
          className="pet-mood-bubble"
          style={{ left: `${petPosition}%`, zIndex: 50 }}
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
