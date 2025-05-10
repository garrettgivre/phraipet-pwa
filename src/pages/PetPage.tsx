// src/pages/PetPage.tsx
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
      {/* Render the customizable room */}
      <PetRoom roomLayers={roomLayers} />

      {/* Pet Status Section */}
      <div className="petSection">
        <img
          src="/pet/Neutral.png"
          alt="Your Pet"
          className="petHero"
        />

        <section className="needBigSection">
          {needInfo.map((n) => (
            <div key={n.need} className="needBig">
              <span className="needBigEmoji">{n.emoji}</span>
              <div className="needBigWrap">
                <progress max={150} value={n.value + 30} />
                <span className="needBigLabel">
                  {n.need.charAt(0).toUpperCase() + n.need.slice(1)}
                </span>
                <span className="needBigDesc">{n.desc}</span>
                <span className="needBigNum">({n.value})</span>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Inventory Panel */}
      <Inventory items={sampleInventory} onEquip={handleEquip} />
    </div>
  );
}
