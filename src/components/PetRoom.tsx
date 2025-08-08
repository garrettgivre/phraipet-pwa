// src/components/PetRoom.tsx
import "./PetRoom.css";
import { useEffect, useState, useRef } from "react";
import type { ToyInventoryItem, RoomDecorItem } from "../types";
import FoodItem from "./FoodItem";

interface PetRoomProps {
  floor: string;
  wall: string;
  ceiling: string;
  trim?: string;
  decor?: RoomDecorItem[];
  frontDecor?: RoomDecorItem[];
  backDecor?: RoomDecorItem[];
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
  constrainToRoom?: boolean;
}

const ROOM_ZONES = {
  FLOOR: { startY: 70, endY: 100 },
  WALL: { startY: 15, endY: 70 },
  CEILING: { startY: 0, endY: 15 }
};

const ROOM_BOUNDARIES = {
  LEFT: 15,
  RIGHT: 85
};

export default function PetRoom({ 
  floor, wall, ceiling, trim, decor = [], frontDecor = [], backDecor = [], overlay, 
  petImage, petPosition, moodPhrase, activeToy, isPlaying, isWalking, isFacingRight = false,
  foodItem, onFoodEaten, onFoodBite, constrainToRoom = false
}: PetRoomProps) {
  const [isEating, setIsEating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const constrainedPetPosition = constrainToRoom 
    ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, petPosition))
    : petPosition;

  useEffect(() => { setIsEating(!!foodItem); }, [foodItem]);

  const itemsBehindPet = [...backDecor];
  const itemsInFrontOfPet = [...frontDecor];

  if (decor && decor.length > 0) {
    decor.forEach(item => {
      if (item.position === "back") itemsBehindPet.push(item);
      else itemsInFrontOfPet.push(item);
    });
  }

  const calculatePosition = (
    x: number,
    y: number,
    width: number,
    height: number,
    zone?: "FLOOR" | "WALL" | "CEILING",
    relativeTo?: { itemSrc: string; offsetX: number; offsetY: number } | null
  ) => {
    const constrainedX = constrainToRoom ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, x)) : x;

    let resolvedZone: "FLOOR" | "WALL" | "CEILING" = zone || "WALL";
    if (!zone) {
      if (y >= ROOM_ZONES.FLOOR.startY) resolvedZone = "FLOOR";
      else if (y <= ROOM_ZONES.CEILING.endY) resolvedZone = "CEILING";
    }
    if (relativeTo) {
      const allItems = [...itemsBehindPet, ...itemsInFrontOfPet];
      const referenceItem = allItems.find(item => item.src === relativeTo.itemSrc);
      if (referenceItem) {
        const refX = constrainToRoom 
          ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, referenceItem.x + relativeTo.offsetX))
          : referenceItem.x + relativeTo.offsetX;
        return {
          left: `${refX}%`,
          top: `${referenceItem.y + relativeTo.offsetY}%`,
          width: width ? `${width * (containerRef.current?.clientWidth || 300) / 1080}px` : "auto",
          height: height ? `${height * (containerRef.current?.clientHeight || 530) / 1920}px` : "auto",
          transform: "translate(-50%, -50%)"
        };
      }
    }

    let finalWidth, finalHeight;
    if (width && height) {
      const containerWidth = containerRef.current?.clientWidth || 300;
      const containerHeight = containerRef.current?.clientHeight || 530;
      const refWidth = 1080;
      const refHeight = 1920;
      const widthRatio = containerWidth / refWidth;
      const heightRatio = containerHeight / refHeight;
      const scaleFactor = Math.min(widthRatio, heightRatio);
      finalWidth = width * scaleFactor;
      finalHeight = height * scaleFactor;
    }

    return {
      left: `${constrainedX}%`,
      top: `${y}%`,
      width: finalWidth ? `${finalWidth}px` : "auto",
      height: finalHeight ? `${finalHeight}px` : "auto",
      transform: "translate(-50%, -50%)"
    };
  };

  return (
    <div ref={containerRef} className="pet-room-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="room-background-layers">
        <img src={floor} alt="Floor" style={{ zIndex: 1 }} />
        <img src={wall} alt="Wall" style={{ zIndex: 2 }} />
        <img src={ceiling} alt="Ceiling" style={{ zIndex: 3 }} />
        {trim && <img src={trim} alt="Trim" style={{ zIndex: 4 }} />}
      </div>

      {itemsBehindPet.map((item, idx) => {
        const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0, item.zone, item.relativeTo);
        return (
          <img key={`back-decor-${idx}`} className="decor" src={item.src} style={{ position: 'absolute', left: position.left, top: position.top, width: position.width, height: position.height, zIndex: 10 + idx, objectFit: "contain", transform: item.rotation ? `translate(-50%, -50%) rotate(${item.rotation}deg)` : position.transform }} alt="" />
        );
      })}

      {activeToy && isPlaying && (
        <img className="toy playing" src={typeof activeToy === 'string' ? activeToy : activeToy.src || '/assets/toys/ball.png'} alt="Toy" style={{ left: `${constrainedPetPosition + (isFacingRight ? -12 : 12)}%` }} />
      )}

      {foodItem && (
        <FoodItem key={`food-${foodItem.src}`} src={foodItem.src} position={constrainToRoom ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, foodItem.position)) : foodItem.position} hungerRestored={foodItem.hungerRestored || 15} onEaten={() => { if (onFoodEaten) onFoodEaten(); }} onBite={onFoodBite} />
      )}

      <img className={`pet-layer ${isPlaying ? 'playing' : ''} ${isWalking ? 'waddling' : ''} ${isFacingRight ? 'flip' : ''} ${isEating ? 'pet-eating' : ''}`} src={petImage} style={{ left: `${constrainedPetPosition}%` }} alt="Pet" />

      {moodPhrase && (
        <div className="pet-mood-bubble" style={{ left: `${constrainedPetPosition}%` }}>
          <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white' }} />
          <p style={{ margin: 0, textAlign: 'center', fontSize: '0.85rem' }}>{moodPhrase}</p>
        </div>
      )}

      {itemsInFrontOfPet.map((item, idx) => {
        const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0, item.zone, item.relativeTo);
        return (
          <img key={`front-decor-${idx}`} className="decor" src={item.src} style={{ position: 'absolute', left: position.left, top: position.top, width: position.width, height: position.height, zIndex: 40 + idx, objectFit: "contain", transform: item.rotation ? `translate(-50%, -50%) rotate(${item.rotation}deg)` : position.transform }} alt="" />
        );
      })}

      {overlay && (
        <img className="overlay" src={overlay} alt="Overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 60 }} />
      )}
    </div>
  );
}
