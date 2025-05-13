import { useInventory } from "../contexts/InventoryContext";
import type { NeedInfo } from "../types";
import "./PetPage.css";

export default function PetPage({ needInfo }: { needInfo: NeedInfo[] }) {
  const { roomLayers } = useInventory();

  return (
    <div className="petPage">
      <img src={roomLayers.ceiling} alt="Ceiling" className="layer ceiling" />
      <img src={roomLayers.wall} alt="Wall" className="layer wall" />
      <img src={roomLayers.floor} alt="Floor" className="layer floor" />

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
    </div>
  );
}
