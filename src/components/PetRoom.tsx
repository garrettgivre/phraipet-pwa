// src/components/PetRoom.tsx
import "./PetRoom.css";

type DecorItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
  backDecor: DecorItem[];
  frontDecor: DecorItem[];
  overlay: string;
};

export default function PetRoom({ roomLayers }: { roomLayers: RoomLayers }) {
  return (
    <div className="pet-room">
      {/* Behind Pet */}
      <img className="floor-layer" src={roomLayers.floor} alt="Floor" />
      <img className="wall-layer" src={roomLayers.wall} alt="Wall" />
      <img className="ceiling-layer" src={roomLayers.ceiling} alt="Ceiling" />

      {roomLayers.backDecor.map((item, idx) => (
        <img
          key={idx}
          className="decor back-decor"
          src={item.src}
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: item.width ? `${item.width}px` : "auto",
            height: item.height ? `${item.height}px` : "auto",
          }}
          alt=""
        />
      ))}

      {/* Pet Layer */}
      <img className="pet-layer" src="/assets/pets/default_pet.png" alt="Pet" />

      {/* In Front of Pet */}
      {roomLayers.frontDecor.map((item, idx) => (
        <img
          key={idx}
          className="decor front-decor"
          src={item.src}
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: item.width ? `${item.width}px` : "auto",
            height: item.height ? `${item.height}px` : "auto",
          }}
          alt=""
        />
      ))}

      {roomLayers.overlay && (
        <img className="overlay-layer" src={roomLayers.overlay} alt="Overlay" />
      )}
    </div>
  );
}
