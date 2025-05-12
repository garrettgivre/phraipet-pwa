// src/components/Header.tsx
import { useNavigate } from "react-router-dom";
import "./Header.css";

interface NeedInfo {
  need: string;
  emoji: string;
  value: number; // 0 to 100
}

export default function Header({
  coins = 100,
  petImage = "/pet/Neutral.png",
  needs = []
}: {
  coins?: number;
  petImage?: string;
  needs?: NeedInfo[];
}) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {/* Left: Pet Icon */}
      <div className="pet-icon-wrapper">
        <img src={petImage} alt="Pet" className="pet-icon" />
      </div>

      {/* Center: Needs Display */}
      <div className="needs-wrapper">
        {needs.map((n) => (
          <div key={n.need} className="need-circle">
            <svg viewBox="0 0 36 36" className="circular-chart" preserveAspectRatio="xMidYMid meet">

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
  <text x="18" y="20.35" className="emoji-text">
    {n.emoji}
  </text>
</svg>

          </div>
        ))}
      </div>

      {/* Right: Coin Counter */}
      <div className="coin-counter" onClick={() => navigate("/inventory")}>
        <img src="/assets/icons/coin.png" alt="Coins" className="coin-icon" />
        <span>{coins}</span>
      </div>
    </header>
  );
}
