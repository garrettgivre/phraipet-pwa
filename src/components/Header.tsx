import { useNavigate } from "react-router-dom";
import type { NeedInfo } from "../types"; // Assuming NeedInfo is defined in types.ts
import "./Header.css";

interface HeaderProps {
  coins?: number;
  petImage?: string;
  needs?: NeedInfo[];
}

export default function Header({
  coins = 100,
  petImage = "/pet/Neutral.png",
  needs = [] // Default to an empty array if needs are not provided
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {/* Left: Pet Icon */}
      <div className="pet-icon-wrapper" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
        <img src={petImage} alt="Pet" className="pet-icon" />
      </div>

      {/* Center: Needs Display */}
      <div className="needs-wrapper">
        {/* Ensure needs array is not undefined before mapping */}
        {needs && needs.map((n) => (
          <div key={n.need} className="need-circle" title={`${n.need}: ${n.desc} (${n.value})`}>
            <svg viewBox="0 0 36 36" className="circular-chart" preserveAspectRatio="xMidYMid meet">
              <path
                className="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="circle"
                strokeDasharray={`${n.value}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                transform="rotate(-90 18 18)" // Rotates the start point of the progress stroke to the top
              />
              {/* Emoji Text - Removed the individual transform rotate from here */}
              <text 
                x="18" 
                y="20.35" // Adjusted y for vertical centering (dominant-baseline helps)
                className="emoji-text"
              >
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