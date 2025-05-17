// src/components/PetRoom.tsx
import "./PetRoom.css";

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
  activeToy?: string;
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

      {/* Pet Layer */}
      <img 
        className={`pet-layer ${isPlaying ? 'playing' : ''}`}
        src={petImage}
        style={{ left: `${petPosition}%` }}
        alt="Pet"
      />

      {overlay && (
        <img className="overlay" src={overlay} alt="Overlay" />
      )}
    </div>
  );
}
