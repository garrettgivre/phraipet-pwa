import { useNavigate } from "react-router-dom";
import "./CoinDisplay.css";

interface CoinDisplayProps {
  coins?: number;
}

export default function CoinDisplay({ coins = 100 }: CoinDisplayProps) {
  const navigate = useNavigate();

  return (
    <div className="coin-display">
      <div className="coin-counter" onClick={() => navigate("/inventory")}>
        <img src="/assets/icons/coin.png" alt="Coins" className="coin-icon" />
        <span>{coins}</span>
      </div>
    </div>
  );
} 