import { useState } from "react";
import PetRoom from "../components/PetRoom";
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
  { id: "floor1", name: "Wood Floor", type: "floor", src: "/assets/floors/wood.png" },
  { id: "wall1", name: "Starry Wall", type: "wall", src: "/assets/walls/starry.png" },
  { id: "ceiling1", name: "Sky Ceiling", type: "ceiling", src: "/assets/ceilings/sky.png" },
  { id: "decor1", name: "Plant", type: "backDecor", src: "/assets/decorations/plant.png" },
  { id: "overlay1", name: "Sparkles", type: "overlay", src: "/assets/overlays/sparkles.png" }
];

export default function PetPage({ needInfo }: { needInfo: NeedInfo[] }) {
  const [roomLayers, setRoomLayers] = useState({
    floor: "/assets/floors/wood.png",
    wall: "/assets/walls/starry.png",
    ceiling: "/assets/ceilings/sky.png",
    backDecor: [] as DecorItem[],
    frontDecor: [] as DecorItem[],
    overlay: ""
  });

  const handleEquip = (item: InventoryItem) => {
    if (item.type === "backDecor" || item.type === "frontDecor") {
      setRoomLayers((prev) => ({
        ...prev,
        [item.type]: [...prev[item.type], { src: item.src, x: 100, y: 200 }]
      }));
    } else {
      setRoomLayers((prev) => ({ ...prev, [item.type]: item.src }));
    }
  };

  return (
    <div className="petPageContainer">
      <PetRoom roomLayers={roomLayers} />

      <div className="petSection">
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
                />
                <text x="18" y="20.35" className="emoji-text">{n.emoji}</text>
              </svg>
            </div>
          ))}
        </div>

        {/* Main Pet */}
        <img src="/pet/Neutral.png" alt="Your Pet" className="petHero" />
      </div>

      <Inventory items={sampleInventory} onEquip={handleEquip} />
    </div>
  );
}
