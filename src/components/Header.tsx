import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { petService } from '../services/firebase';
import type { NeedInfo } from "../types";
import { getNeedBarColor } from "../utils/colorUtils";
import { getPetEmotionImage } from "../utils/petImageSelector";
import "./Header.css";

interface HeaderProps {
  coins?: number;
  needs?: NeedInfo[];
  compact?: boolean; // New prop for compact mode on Pet Page
  onSettingsClick?: () => void; // Optional setting click handler
}

export default function Header({
  coins = 100,
  needs = [],
  compact = false,
  onSettingsClick
}: HeaderProps) {
  const navigate = useNavigate();
  const iconSize = 20; // Desired display size for icons in the header circles
  const [petImage, setPetImage] = useState<string>('/pet/Neutral.png');

  useEffect(() => {
    // Initial load
    if (import.meta.env.DEV) console.log("Header - Setting up pet subscription");
    
    // Try to get local pet data immediately to avoid flash
    try {
       // We don't have direct access to App's state here, but we can try default if needed
       // or wait for firebase.
    } catch (e) {
      console.error("Header - error reading local state", e);
    }

    const unsubscribe = petService.subscribeToPet((pet) => {
      if (pet) {
        const image = getPetEmotionImage(pet);
        if (import.meta.env.DEV) console.log("Header - Updating pet image:", image);
        setPetImage(image);
      } else {
         if (import.meta.env.DEV) console.log("Header - No pet image found, using default");
         setPetImage('/pet/Neutral.png');
      }
    });
    return () => unsubscribe();
  }, []);

  if (import.meta.env.DEV) {
    console.log("Header - Received needs:", needs);
    console.log("Header - Needs length:", needs.length);
  }

  const goHome = (): void => { void navigate("/"); };
  const goInventory = (): void => { void navigate("/inventory"); };

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
              if (target.src.endsWith('/pet/Neutral.png')) {
                // Already failed on default, prevent infinite loop
                return;
              }
              // Fallback to neutral
              target.src = '/pet/Neutral.png';
            }}
          />
        </div>
      )}

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

      <div className="coin-counter" onClick={goInventory}>
        <img src="/assets/icons/coin.png" alt="Coins" className="coin-icon" />
        <span>{coins}</span>
      </div>
    </header>
  );
}
