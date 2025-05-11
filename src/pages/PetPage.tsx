import { useState } from "react";
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

export default function PetPage({ needInfo }: { needInfo: NeedInfo[] }) {
  const [roomLayers] = useState({
    floor: "/assets/floors/wood.png",
    wall: "/assets/walls/starry.png",
    ceiling: "/assets/ceilings/sky.png",
    backDecor: [] as DecorItem[],
    frontDecor: [] as DecorItem[],
    overlay: ""
  });

  return (
    <div className="petPage">
      {/* Layers Behind the Pet */}
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
              />
              <text x="18" y="20.35" className="emoji-text">{n.emoji}</text>
            </svg>
          </div>
        ))}
      </div>

      {/* Pet */}
      <img src="/pet/Neutral.png" alt="Your Pet" className="petHero" />

      {/* Layers In Front of Pet */}
      {roomLayers.frontDecor.map((item, idx) => (
        <img key={idx} src={item.src} className="layer front-decor" style={{ left: item.x, top: item.y }} />
      ))}
      {roomLayers.overlay && (
        <img src={roomLayers.overlay} alt="Overlay" className="layer overlay" />
      )}
    </div>
  );
}
