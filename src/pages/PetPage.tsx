import { useInventory } from "../contexts/InventoryContext";
import "./PetPage.css";

interface NeedInfo {
  need: string;
  emoji: string;
  value: number; // 0 to 100
}

const sampleNeeds: NeedInfo[] = [
  { need: "hunger", emoji: "🍕", value: 80 },
  { need: "cleanliness", emoji: "🧼", value: 60 },
  { need: "happiness", emoji: "🎲", value: 90 },
  { need: "affection", emoji: "🤗", value: 75 },
  { need: "spirit", emoji: "✨", value: 50 },
];

export default function PetPage() {
  const { roomLayers } = useInventory();

  return (
    <div className="petPage">
      {/* Background Layers */}
      <img src={roomLayers.ceiling} alt="Ceiling" className="layer ceiling" />
      <img src={roomLayers.wall} alt="Wall" className="layer wall" />
      <img src={roomLayers.floor} alt="Floor" className="layer floor" />

      {/* Needs Overlay */}
      <div className="needsOverlay">
        {sampleNeeds.map((n) => (
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
