import { useNavigate } from "react-router-dom";
import "./CoinDisplay.css";

interface CoinDisplayProps {
  coins?: number;
  className?: string;
}

export default function CoinDisplay({ coins = 100, className = "" }: CoinDisplayProps) {
  const navigate = useNavigate();

  return (
    <div className={`coin-display ${className}`}>
      <div className="coin-counter" onClick={() => navigate("/inventory")}>
        <img src="/assets/icons/coin.png" alt="Coins" className="coin-icon" />
        <span>{coins}</span>
      </div>
    </div>
  );
} 