// src/pages/PetPage.tsx
import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import { useToyAnimation } from "../contexts/ToyAnimationContext";
import type { NeedInfo, Pet as PetType, Need as NeedType } from "../types";
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";
import { useState, useEffect } from "react";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => void;
}

export default function PetPage({ pet, needInfo, onIncreaseAffection }: PetPageProps) {
  const { roomLayers, roomLayersLoading } = useInventory();
  const { activeToy, isPlaying } = useToyAnimation();
  const navigate = useNavigate();
  const [toyPosition, setToyPosition] = useState<'left' | 'right'>('right');

  // Set random toy position when a new toy becomes active
  useEffect(() => {
    if (activeToy) {
      setToyPosition(Math.random() < 0.5 ? 'left' : 'right');
    }
  }, [activeToy]);

  const moodPhrase = getPetMoodPhrase(pet);

  const currentCeiling = roomLayers?.ceiling || "/assets/ceilings/classic-ceiling.png";
  const currentWall = roomLayers?.wall || "/assets/walls/classic-wall.png";
  const currentFloor = roomLayers?.floor || "/assets/floors/classic-floor.png";
  const overlaySrc = roomLayers?.overlay || "";

  const iconDisplaySize = 24;

  const handleNeedClick = (needType: NeedType) => {
    console.log(`Need circle clicked: ${needType}`);
    switch (needType) {
      case "affection":
        onIncreaseAffection(5);
        break;
      case "hunger":
        navigate('/inventory', {
          state: {
            targetMainCategory: 'Food',
            targetSubCategory: 'Snack'
          }
        });
        break;
      case "cleanliness":
        navigate('/inventory', {
          state: {
            targetMainCategory: 'Grooming',
            targetSubCategory: 'BasicKit'
          }
        });
        break;
      case "happiness":
        navigate('/inventory', {
          state: {
            targetMainCategory: 'Toys',
            targetSubCategory: 'Classic'
          }
        });
        break;
      case "spirit":
        console.log("Spirit clicked - action TBD.");
        break;
      default:
        console.log("Unknown need clicked:", needType);
    }
  };

  return (
    <div className={`petPage ${!roomLayersLoading ? 'loaded' : ''}`} key={currentFloor + currentWall}>
      {!roomLayersLoading && currentCeiling && <img src={currentCeiling} alt="Ceiling" className="layer ceiling" />}
      {!roomLayersLoading && currentWall && <img src={currentWall} alt="Wall" className="layer wall" />}
      {!roomLayersLoading && currentFloor && <img src={currentFloor} alt="Floor" className="layer floor" />}

      <div className="pet-display-area">
        {pet && moodPhrase && (
          <div className="pet-mood-bubble">
            <p>{moodPhrase}</p>
          </div>
        )}
        {activeToy && toyPosition === 'left' && (
          <img 
            src={activeToy.src} 
            alt={activeToy.name} 
            className={`toy ${isPlaying ? 'playing' : ''}`}
          />
        )}
        <img 
          src={pet?.image || "/pet/Neutral.png"} 
          alt="Your Pet" 
          className={`petHero ${isPlaying ? 'playing' : ''}`} 
        />
        {activeToy && toyPosition === 'right' && (
          <img 
            src={activeToy.src} 
            alt={activeToy.name} 
            className={`toy ${isPlaying ? 'playing' : ''}`}
          />
        )}
      </div>

      <div className="pet-page-needs-container">
        {pet && needInfo && needInfo.length > 0 && needInfo.map((n) => (
          <div key={n.need} className="need-item-interactive" onClick={() => handleNeedClick(n.need)} title={`Care for ${n.need} (${n.desc})`}>
            <div className="need-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray={`${n.value}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" transform="rotate(-90 18 18)" />
                <image
                  href={n.iconSrc}
                  x={(36 - iconDisplaySize) / 2}
                  y={(36 - iconDisplaySize) / 2}
                  height={iconDisplaySize}
                  width={iconDisplaySize}
                  className="need-icon-image"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {!roomLayersLoading && overlaySrc && (
        <img src={overlaySrc} alt="Room Overlay" className="layer overlay" />
      )}

      <div className="paintbrush-icon" onClick={() => navigate("/inventory")}>
        <img src="/assets/icons/paintbrush.png" alt="Customize Room" />
      </div>
    </div>
  );
}
