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
}

// Define room zones for better positioning
const ROOM_ZONES = {
  FLOOR: { startY: 60, endY: 100 },     // Bottom 40% is floor
  WALL: { startY: 15, endY: 60 },       // Middle area is wall
  CEILING: { startY: 0, endY: 15 }      // Top 15% is ceiling
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
  onFoodBite
}: PetRoomProps) {
  const [isEating, setIsEating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerAspectRatio, setContainerAspectRatio] = useState(16/9);

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
        return {
          left: `${referenceItem.x + relativeTo.offsetX}%`,
          top: `${referenceItem.y + relativeTo.offsetY}%`,
          width: width ? `${width}px` : "auto",
          height: height ? `${height}px` : "auto",
          transform: "translate(-50%, -50%)"
        };
      }
    }
    
    // Scale size based on container dimensions for consistent proportions
    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerRef.current?.clientHeight || 200;
    const scaleFactor = Math.min(containerWidth / 400, containerHeight / 300);
    
    const scaledWidth = width ? width * scaleFactor : 0;
    const scaledHeight = height ? height * scaleFactor : 0;
    
    return {
      left: `${x}%`,
      top: `${y}%`,
      width: width ? `${scaledWidth}px` : "auto",
      height: height ? `${scaledHeight}px` : "auto",
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
      <div 
        className="room-background-layers"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      >
        {/* Floor - Always visible at bottom */}
        <img 
          src={floor} 
          alt="Floor" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
        
        {/* Wall - Middle layer */}
        <img 
          src={wall} 
          alt="Wall" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 2
          }}
        />
        
        {/* Ceiling - Always visible at top */}
        <img 
          src={ceiling} 
          alt="Ceiling" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 3
          }}
        />
        
        {/* Trim - Decorative layer */}
        {trim && (
          <img 
            src={trim} 
            alt="Trim" 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 4
            }}
          />
        )}
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
              transform: position.transform
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
            position: 'absolute',
            left: `${petPosition + (isFacingRight ? -12 : 12)}%`, 
            bottom: `22%`,
            zIndex: 20
          }}
        />
      )}

      {/* Food item display */}
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
        style={{ 
          position: 'absolute',
          left: `${petPosition}%`, 
          bottom: '30%', 
          zIndex: 30 
        }}
        alt="Pet"
      />

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
              transform: position.transform
            }}
            alt=""
          />
        );
      })}

      {/* Mood phrase bubble - positioned right above pet's head */}
      {moodPhrase && (
        <div 
          className="pet-mood-bubble"
          style={{ 
            position: 'absolute',
            left: `${petPosition}%`,
            bottom: 'calc(30% + 20px)', // Reduced offset to be closer to pet's head
            transform: 'translateX(-50%)', // Center horizontally
            zIndex: 50,
            background: 'white',
            padding: '6px 10px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            maxWidth: '80%',
            marginBottom: '5px' // Small gap between bubble and pet
          }}
        >
          <div 
            style={{ 
              position: 'absolute', 
              bottom: '-8px', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              width: '0', 
              height: '0', 
              borderLeft: '8px solid transparent', 
              borderRight: '8px solid transparent', 
              borderTop: '8px solid white' 
            }} 
          />
          <p style={{ margin: 0, textAlign: 'center' }}>{moodPhrase}</p>
        </div>
      )}

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
