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
  constrainToRoom?: boolean; // New prop to constrain pet and items to room bounds
}

// Define room zones for better positioning in portrait mode (9:16)
const ROOM_ZONES = {
  FLOOR: { startY: 70, endY: 100 },    // Bottom 30% is floor
  WALL: { startY: 15, endY: 70 },      // Middle area is wall (larger in portrait)
  CEILING: { startY: 0, endY: 15 }     // Top 15% is ceiling
};

// Pet movement boundaries (percent of room width)
const ROOM_BOUNDARIES = {
  LEFT: 15,   // Minimum left position (%) - adjusted for portrait
  RIGHT: 85   // Maximum right position (%) - adjusted for portrait
};

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
  onFoodBite,
  constrainToRoom = false
}: PetRoomProps) {
  const [isEating, setIsEating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerAspectRatio, setContainerAspectRatio] = useState(16/9);

  // Apply room constraints if enabled
  const constrainedPetPosition = constrainToRoom 
    ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, petPosition))
    : petPosition;

  // Handle eating animation state
  useEffect(() => {
    if (foodItem) {
      setIsEating(true);
    } else {
      setIsEating(false);
    }
  }, [foodItem]);

  // Monitor container aspect ratio changes
  useEffect(() => {
    const updateAspectRatio = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      if (width && height) {
        setContainerAspectRatio(width / height);
      }
    };
    
    // Initial update
    updateAspectRatio();
    
    // Update on resize
    const resizeObserver = new ResizeObserver(updateAspectRatio);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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

  // Function to calculate position in a way that maintains relative position across aspect ratios
  const calculatePosition = (x: number, y: number, width: number, height: number, zone?: "FLOOR" | "WALL" | "CEILING", relativeTo?: { itemSrc: string; offsetX: number; offsetY: number } | null) => {
    // If constrainToRoom is enabled, restrict x within boundaries
    const constrainedX = constrainToRoom ? Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, x)) : x;

    // Determine which room zone this item belongs to based on y-position or use provided zone
    let itemZone = zone || "WALL";
    if (!zone) {
      if (y >= ROOM_ZONES.FLOOR.startY) {
        itemZone = "FLOOR";
      } else if (y <= ROOM_ZONES.CEILING.endY) {
        itemZone = "CEILING";
      }
    }
    
    // If this item should be positioned relative to another item, find it
    if (relativeTo) {
      // Find the reference item in both arrays
      const allItems = [...itemsBehindPet, ...itemsInFrontOfPet];
      const referenceItem = allItems.find(item => item.src === relativeTo.itemSrc);
      
      if (referenceItem) {
        // Calculate position based on the reference item's position
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
    
    // Scale dimensions relative to container size instead of fixed pixels
    let finalWidth, finalHeight;
    
    if (width && height) {
      const containerWidth = containerRef.current?.clientWidth || 300;
      const containerHeight = containerRef.current?.clientHeight || 530;
      
      // Reference design size (9:16 aspect ratio)
      const refWidth = 1080;
      const refHeight = 1920;
      
      // Scale based on container dimensions to maintain proportions
      const widthRatio = containerWidth / refWidth;
      const heightRatio = containerHeight / refHeight;
      
      // Use the smaller ratio to ensure items fit in the container
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
    <div 
      ref={containerRef}
      className="pet-room-container" 
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Full-size background layers - This ensures they fill the space */}
      <div className="room-background-layers">
        {/* Floor - Always visible at bottom */}
        <img src={floor} alt="Floor" style={{ zIndex: 1 }} />
        
        {/* Wall - Middle layer */}
        <img src={wall} alt="Wall" style={{ zIndex: 2 }} />
        
        {/* Ceiling - Always visible at top */}
        <img src={ceiling} alt="Ceiling" style={{ zIndex: 3 }} />
        
        {/* Trim - Decorative layer */}
        {trim && <img src={trim} alt="Trim" style={{ zIndex: 4 }} />}
      </div>
      
      {/* Items behind pet */}
      {itemsBehindPet.map((item, idx) => {
        const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0, item.zone, item.relativeTo);
        return (
          <img
            key={`back-decor-${idx}`}
            className="decor"
            src={item.src}
            style={{
              position: 'absolute',
              left: position.left,
              top: position.top,
              width: position.width,
              height: position.height,
              zIndex: 10 + idx,
              objectFit: "contain",
              transform: item.rotation 
                ? `translate(-50%, -50%) rotate(${item.rotation}deg)` 
                : position.transform
            }}
            alt=""
          />
        );
      })}

      {/* Active toy display */}
      {activeToy && isPlaying && (
        <img 
          className="toy playing"
          src={typeof activeToy === 'string' 
              ? activeToy 
              : activeToy.src || '/assets/toys/ball.png'} 
          alt="Toy"
          style={{ 
            left: `${constrainedPetPosition + (isFacingRight ? -12 : 12)}%`,
          }}
        />
      )}

      {/* Food item display */}
      {foodItem && (
        <FoodItem 
          key={`food-${foodItem.src}`}
          src={foodItem.src}
          position={constrainToRoom ? 
            Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, foodItem.position)) : 
            foodItem.position}
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
        style={{ 
          left: `${constrainedPetPosition}%`, 
        }}
        alt="Pet"
      />
      
      {/* Speech bubble positioned right above pet */}
      {moodPhrase && (
        <div 
          className="pet-mood-bubble"
          style={{ 
            left: `${constrainedPetPosition}%`,
          }}
        >
          <div 
            style={{ 
              position: 'absolute', 
              bottom: '-6px',
              left: '50%', 
              transform: 'translateX(-50%)', 
              width: '0', 
              height: '0', 
              borderLeft: '6px solid transparent', 
              borderRight: '6px solid transparent', 
              borderTop: '6px solid white' 
            }} 
          />
          <p style={{ margin: 0, textAlign: 'center', fontSize: '0.85rem' }}>{moodPhrase}</p>
        </div>
      )}

      {/* Items in front of pet */}
      {itemsInFrontOfPet.map((item, idx) => {
        const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0, item.zone, item.relativeTo);
        return (
          <img
            key={`front-decor-${idx}`}
            className="decor"
            src={item.src}
            style={{
              position: 'absolute',
              left: position.left,
              top: position.top,
              width: position.width,
              height: position.height,
              zIndex: 40 + idx,
              objectFit: "contain",
              transform: item.rotation 
                ? `translate(-50%, -50%) rotate(${item.rotation}deg)` 
                : position.transform
            }}
            alt=""
          />
        );
      })}

      {/* Overlay Layer */}
      {overlay && (
        <img 
          className="overlay" 
          src={overlay} 
          alt="Overlay" 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 60
          }} 
        />
      )}
    </div>
  );
}
