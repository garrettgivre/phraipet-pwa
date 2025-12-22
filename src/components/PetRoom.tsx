// src/components/PetRoom.tsx
import "./PetRoom.css";
import { useEffect, useState, useRef } from "react";
import type { ToyInventoryItem, RoomDecorItem } from "../types";
import FoodItem from "./FoodItem";
import CrystalDust from "./CrystalDust";

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
  moodPhrase?: string | undefined;
  activeToy?: ToyInventoryItem | string | null;
  isPlaying?: boolean;
  isWalking?: boolean;
  isFacingRight?: boolean;
  isSquashing?: boolean;
  foodItem?: { src: string; position: number; hungerRestored?: number } | null;
  onFoodEaten?: () => void;
  onFoodBite?: (biteNumber: number, hungerAmount: number) => void;
  constrainToRoom?: boolean;
  crystals?: { id: string; x: number; y: number }[];
  onCollectCrystal?: (id: string) => void;
  onPetClick?: () => void;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
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
  floor, wall, ceiling, trim, decor = [], frontDecor = [], backDecor = [],   overlay, 
  petImage, petPosition, moodPhrase, activeToy, isPlaying, isWalking, isFacingRight = false, isSquashing = false,
  foodItem, onFoodEaten, onFoodBite, constrainToRoom = false, crystals, onCollectCrystal, onPetClick
}: PetRoomProps) {
  const [isChomping, setIsChomping] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if the pet image is the turning image to apply special flipping logic
  const isTurning = petImage.includes('Walk-Turning');

  const constrainedPetPosition = constrainToRoom
    ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, petPosition))
    : petPosition;

  const handleInternalBite = (biteNumber: number, hungerAmount: number) => {
    setIsChomping(true);
    setTimeout(() => setIsChomping(false), 500);
    if (onFoodBite) {
      onFoodBite(biteNumber, hungerAmount);
    }
  };

  const handlePetClick = (e: React.MouseEvent) => {
    if (onPetClick) {
      onPetClick();
    }
    
    // Calculate click position relative to the container
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Get relative coordinates
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Add a floating heart
        const newHeart = { id: Date.now() + Math.random(), x, y };
        setFloatingHearts(prev => [...prev, newHeart]);

        // Cleanup heart after animation (1s)
        setTimeout(() => {
            setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
        }, 1000);
    }
  };

  // Prefer explicit front/back arrays; only fall back to legacy `decor` if both are empty
  const itemsBehindPet = [...backDecor];
  const itemsInFrontOfPet = [...frontDecor];

  if (itemsBehindPet.length === 0 && itemsInFrontOfPet.length === 0 && decor && decor.length > 0) {
    for (const item of decor) {
      if (item.position === "back") itemsBehindPet.push(item);
      else itemsInFrontOfPet.push(item);
    }
  }

  const calculatePosition = (
    x: number,
    y: number,
    width: number,
    height: number,
    zone?: "FLOOR" | "WALL" | "CEILING",
    relativeTo?: { itemSrc: string; offsetX: number; offsetY: number } | null
  ) => {
    // Furniture/decor should be placeable to full edges; only pet/food are constrained elsewhere
    const constrainedX = x;

    if (!zone) {
      if (y >= ROOM_ZONES.FLOOR.startY) {
        // FLOOR zone implied
      } else if (y <= ROOM_ZONES.CEILING.endY) {
        // CEILING zone implied
      }
    }
    if (relativeTo) {
      const allItems = [...itemsBehindPet, ...itemsInFrontOfPet];
      const referenceItem = allItems.find(item => item.src === relativeTo.itemSrc);
      if (referenceItem) {
        const refX = referenceItem.x + relativeTo.offsetX;
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
        {overlay && <img src={overlay} alt="Overlay" style={{ zIndex: 3 }} />}
        <img src={ceiling} alt="Ceiling" style={{ zIndex: 4 }} />
        {trim && <img src={trim} alt="Trim" style={{ zIndex: 5 }} />}
      </div>

      {itemsBehindPet.map((item, idx) => {
        const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0, item.zone, item.relativeTo);
        return (
          <img key={`back-decor-${idx}`} className="decor" src={item.src} style={{ position: 'absolute', left: position.left, top: position.top, width: position.width, height: position.height, zIndex: 10 + idx, objectFit: "contain", transform: `${position.transform}${item.rotation ? ` rotate(${item.rotation}deg)` : ''}${item.flipped ? ' scaleX(-1)' : ''}${item.flippedV ? ' scaleY(-1)' : ''}` }} alt="" />
        );
      })}

      {crystals && crystals.map(crystal => (
        <div key={crystal.id} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 25, pointerEvents: 'none' }}>
           <CrystalDust
            id={crystal.id}
            x={crystal.x}
            y={crystal.y}
            onCollect={onCollectCrystal || (() => {})}
          />
        </div>
      ))}

      {activeToy && isPlaying && (
        <img className="toy playing" src={typeof activeToy === 'string' ? activeToy : activeToy.src || '/assets/toys/ball.png'} alt="Toy" style={{ left: `${constrainedPetPosition + (isFacingRight ? -12 : 12)}%` }} />
      )}

      {foodItem && (
        <FoodItem key={`food-${foodItem.src}`} src={foodItem.src} position={constrainToRoom ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, foodItem.position)) : foodItem.position} hungerRestored={foodItem.hungerRestored || 15} onEaten={() => { if (onFoodEaten) onFoodEaten(); }} onBite={handleInternalBite} />
      )}

      <div className={`pet-shadow ${isPlaying ? 'playing' : ''} ${isWalking ? 'waddling' : ''} ${isSquashing ? 'squashing' : ''}`} style={{ left: `${constrainedPetPosition}%` }} />

      <img 
        className={`pet-layer ${isPlaying ? 'playing' : ''} ${isWalking ? 'waddling' : ''} ${isFacingRight ? 'flip' : ''} ${isChomping ? 'pet-eating' : ''} ${isTurning && isFacingRight ? 'flip-turning' : ''} ${isSquashing ? 'squashing' : ''}`} 
        src={petImage} 
        style={{ left: `${constrainedPetPosition}%`, cursor: onPetClick ? 'pointer' : 'default' }} 
        alt="Pet"
        onClick={handlePetClick}
      />

      {moodPhrase && (
        <div className="pet-mood-bubble" style={{ left: `${constrainedPetPosition}%` }}>
          <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white' }} />
          <p style={{ margin: 0, textAlign: 'center', fontSize: '0.85rem' }}>{moodPhrase}</p>
        </div>
      )}

      {itemsInFrontOfPet.map((item, idx) => {
        const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0, item.zone, item.relativeTo);
        return (
          <img key={`front-decor-${idx}`} className="decor" src={item.src} style={{ position: 'absolute', left: position.left, top: position.top, width: position.width, height: position.height, zIndex: 40 + idx, objectFit: "contain", transform: `${position.transform}${item.rotation ? ` rotate(${item.rotation}deg)` : ''}${item.flipped ? ' scaleX(-1)' : ''}${item.flippedV ? ' scaleY(-1)' : ''}` }} alt="" />
        );
      })}

      {floatingHearts.map((heart) => (
        <img
          key={heart.id}
          className="floating-heart"
          src="/assets/icons/needs/affection.png"
          alt="Heart"
          style={{
            left: `${heart.x}px`,
            top: `${heart.y}px`,
            position: 'absolute',
          }}
        />
      ))}
    </div>
  );
}
