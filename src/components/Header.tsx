// src/components/Header.tsx
import { useNavigate } from "react-router-dom";
import type { NeedInfo } from "../types";
import { getNeedBarColor } from "../utils/colorUtils";
import "./Header.css";

interface HeaderProps {
  coins?: number;
  needs?: NeedInfo[];
}

export default function Header({
  coins = 100,
  needs = []
}: HeaderProps) {
  const navigate = useNavigate();
  const iconSize = 20; // Desired display size for icons in the header circles

  return (
    <header className="app-header">
      <div className="pet-icon-wrapper" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
        <img src="/pet/neutral.png" alt="Pet" className="pet-icon" />
      </div>

      <div className="needs-wrapper">
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
                style={{ stroke: getNeedBarColor(n.value) }}
                transform="rotate(-90 18 18)"
              />
              {/* MODIFIED: Use SVG image element for icons */}
              <image
                href={n.iconSrc}
                x={(36 - iconSize) / 2} // Center the image
                y={(36 - iconSize) / 2} // Center the image
                height={iconSize}
                width={iconSize}
                className="need-icon-image" // Add a class for potential specific styling
              />
            </svg>
          </div>
        ))}
      </div>

      <div className="coin-counter" onClick={() => navigate("/inventory")}>
        <img src="/assets/icons/coin.png" alt="Coins" className="coin-icon" />
        <span>{coins}</span>
      </div>
    </header>
  );
}
