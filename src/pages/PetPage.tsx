import { useState } from "react";
import Inventory from "../components/Inventory";
import type { Need } from "../types";
import "./PetPage.css";

interface NeedInfo {
  need: Need;
  emoji: string;
  value: number;
  desc: string;
}

type DecorItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

type InventoryItem = {
  id: string;
  name: string;
  type: "floor" | "wall" | "ceiling" | "backDecor" | "frontDecor" | "overlay";
  src: string;
};

const sampleInventory: InventoryItem[] = [
  { id: "classicFloor", name: "Classic Floor", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "classicWall", name: "Classic Wall", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "classicCeiling", name: "Classic Ceiling", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },
  { id: "scienceFloor", name: "Science Floor", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "scienceWall", name: "Science Wall", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "scienceCeiling", name: "Science Ceiling", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },
];

export default function PetPage({ needInfo }: { needInfo: NeedInfo[] }) {
  const [roomLayers, setRoomLayers] = useState({
    floor: "/assets/floors/classic-floor.png",
    wall: "/assets/walls/classic-wall.png",
    ceiling: "/assets/ceilings/classic-ceiling.png",
    backDecor: [] as DecorItem[],
    frontDecor: [] as DecorItem[],
    overlay: ""
  });

  const handleEquip = (item: InventoryItem) => {
    if (["floor", "wall", "ceiling"].includes(item.type)) {
      setRoomLayers((prev) => ({
        ...prev,
        [item.type]: item.src
      }));
    } else if (item.type === "backDecor" || item.type === "frontDecor") {
      setRoomLayers((prev) => ({
        ...prev,
        [item.type]: [...prev[item.type], { src: item.src, x: 100, y: 200 }]
      }));
    } else if (item.type === "overlay") {
      setRoomLayers((prev) => ({ ...prev, overlay: item.src }));
    }
  };

  return (
    <div className="petPage">
      {/* Background Layers */}
      <img src={roomLayers.ceiling} alt="Ceiling" className="layer ceiling" />
      <img src={roomLayers.wall} alt="Wall" className="layer wall" />
      <img src={roomLayers.floor} alt="Floor" className="layer floor" />
      {roomLayers.backDecor.map((item, idx) => (
        <img key={idx} src={item.src} className="layer back-decor" style={{ left: item.x, top: item.y }} />
      ))}

      {/* Needs Overlay */}
      <div className="needsOverlay">
        {needInfo.map((n) => (
          <div key={n.need} className="need-circle">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path
                className="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="circle"
                strokeDasharray={`${n.value}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                transform="rotate(-90 18 18)"
              />
              <text x="18" y="20.35" className="emoji-text" transform="rotate(90, 18, 18)">
                {n.emoji}
              </text>
            </svg>
          </div>
        ))}
      </div>

      {/* Pet */}
      <img src="/pet/Neutral.png" alt="Your Pet" className="petHero" />

      {/* Foreground Layers */}
      {roomLayers.frontDecor.map((item, idx) => (
        <img key={idx} src={item.src} className="layer front-decor" style={{ left: item.x, top: item.y }} />
      ))}
      {roomLayers.overlay && (
        <img src={roomLayers.overlay} alt="Overlay" className="layer overlay" />
      )}

      {/* Inventory */}
      <Inventory items={sampleInventory} onEquip={handleEquip} />
    </div>
  );
}
