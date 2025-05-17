// src/components/PetRoom.tsx
import "./PetRoom.css";

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
}

export default function PetRoom({ floor, wall, ceiling, trim, decor, overlay }: PetRoomProps) {
  return (
    <div className="pet-room">
      {/* Behind Pet */}
      <img className="floor-layer" src={floor} alt="Floor" />
      <img className="wall-layer" src={wall} alt="Wall" />
      <img className="ceiling-layer" src={ceiling} alt="Ceiling" />
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
      <img className="pet-layer" src="/assets/pets/default_pet.png" alt="Pet" />

      {overlay && (
        <img className="overlay-layer" src={overlay} alt="Overlay" />
      )}
    </div>
  );
}
