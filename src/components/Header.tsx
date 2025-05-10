// src/components/Header.tsx
import { useNavigate } from "react-router-dom";
import type { Pet, Need } from "../types";
import "./Header.css";

interface NeedInfo {
  need: Need;
  emoji: string;
  value: number;
  min: number;
  max: number;
}

/** Renders one emoji inside a circular progress ring */
function NeedCircle({ emoji, value, min, max }: NeedInfo) {
  const radius = 20;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const percent = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const dashOffset = circumference * (1 - percent);

  return (
    <div className="needCircle">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#eee"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#4caf50"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="needEmoji">{emoji}</div>
    </div>
  );
}

export default function Header({ pet, coins = 100 }: { pet: Pet | null; coins?: number }) {
  const min = -30, max = 120;
  const navigate = useNavigate();

  const needs: NeedInfo[] = pet
    ? ([
        { need: "hunger", emoji: "🍕", value: pet.hunger, min, max },
        { need: "cleanliness", emoji: "🧼", value: pet.cleanliness, min, max },
        { need: "happiness", emoji: "🎲", value: pet.happiness, min, max },
        { need: "affection", emoji: "🤗", value: pet.affection, min, max },
        { need: "spirit", emoji: "✨", value: pet.spirit, min, max },
      ] as const).map((n) => ({ ...n }))
    : [];

  return (
    <>
      <header className="header">
        <div className="avatar">
          <img
            src="/pet/Neutral.png"
            alt="pet"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <span className="avatarFallback" role="img" aria-label="slime">
            🐣
          </span>
        </div>

        <div className="needList">
          {needs.map((n) => (
            <NeedCircle
              key={n.need}
              need={n.need}
              emoji={n.emoji}
              value={n.value}
              min={n.min}
              max={n.max}
            />
          ))}
        </div>

        <div className="coinCounter" onClick={() => navigate("/inventory")}>
          <img src="/assets/icons/coin.png" alt="Coins" className="coinIcon" />
          <span>{coins}</span>
        </div>
      </header>
      <hr className="divider" />
    </>
  );
}
