import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { petService } from '../services/firebase';
import type { NeedInfo } from "../types";
import { getNeedBarColor } from "../utils/colorUtils";
import { getPetEmotionImage } from "../utils/petImageSelector";
import RoomNavigator from "./RoomNavigator";
import "./Header.css";

interface HeaderProps {
  coins?: number;
  crystals?: number;
  needs?: NeedInfo[];
  compact?: boolean; // New prop for compact mode on Pet Page
  onSettingsClick?: () => void; // Optional setting click handler
  showRoomNav?: boolean; // New prop to show room navigator
}

export default function Header({
  coins = 100,
  crystals = 0,
  needs = [],
  compact = false,
  onSettingsClick,
  showRoomNav = false
}: HeaderProps) {
  const navigate = useNavigate();
  const iconSize = 20; // Desired display size for icons in the header circles
  const [petImage, setPetImage] = useState<string>('/pet/Neutral.png');

  useEffect(() => {
    const unsubscribe = petService.subscribeToPet((pet) => {
      if (pet) {
        const image = getPetEmotionImage(pet);
        setPetImage(image);
      } else {
         setPetImage('/pet/Neutral.png');
      }
    });
    return () => unsubscribe();
  }, []);

  const goHome = (): void => { void navigate("/"); };
  const goBank = (): void => { void navigate("/bank"); };

  return (
    <header className="app-header">
      {compact ? (
        // Compact Header for Pet Page
        <div className="pet-icon-wrapper settings-wrapper" onClick={onSettingsClick} style={{ cursor: 'pointer' }}>
          <img src="/assets/icons/settings.png" alt="Settings" className="settings-icon" />
        </div>
      ) : (
        // Standard Header
        <div className="pet-icon-wrapper" onClick={goHome} style={{ cursor: 'pointer' }}>
          <img 
            src={petImage} 
            alt="Pet" 
            className="pet-icon" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.endsWith('/pet/Neutral.png')) return;
              target.src = '/pet/Neutral.png';
            }}
          />
        </div>
      )}

      {showRoomNav && (
        <div className="header-room-nav">
          <RoomNavigator />
        </div>
      )}

      {!showRoomNav && (
        <div className="needs-wrapper">
          {!compact && needs && needs.map((n) => (
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
                <image
                  href={n.iconSrc}
                  x={(36 - iconSize) / 2}
                  y={(36 - iconSize) / 2}
                  height={iconSize}
                  width={iconSize}
                  className="need-icon-image"
                />
              </svg>
            </div>
          ))}
        </div>
      )}

      <div className="currency-container" onClick={goBank}>
        <div className="coin-counter">
          <img src="/assets/icons/coin.png" alt="Coins" className="coin-icon" />
          <span>{coins}</span>
        </div>
        
        <div className="divider"></div>

        <div className="coin-counter crystal-counter">
          <img src="/pet/phraibits.png" alt="Phraibits" className="coin-icon" />
          <span>{crystals}</span>
        </div>
      </div>
    </header>
  );
}
