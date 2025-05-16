// src/pages/PetPage.tsx
import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import { useToyAnimation } from "../contexts/ToyAnimationContext";
import type { NeedInfo, Pet as PetType, Need as NeedType, ToyInventoryItem } from "../types";
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";
import { useState, useEffect } from "react";
import CoinDisplay from "../components/CoinDisplay";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => void;
}

const getPetImage = (pet: PetType | null, isPlaying: boolean): string => {
  if (!pet) return "/pet/Neutral.png";
  
  // Always use Happy image when playing with toy
  if (isPlaying) return "/pet/Happy.png";

  // Check for overstuffed condition first
  if (pet.hunger >= 100) return "/pet/Tired.png";

  // Get the lowest need value to determine overall mood
  const needs = [
    { value: pet.hunger, type: "hunger" },
    { value: pet.happiness, type: "happiness" },
    { value: pet.cleanliness, type: "cleanliness" },
    { value: pet.affection, type: "affection" },
    { value: pet.spirit, type: "spirit" }
  ];

  const lowestNeed = needs.reduce((min, current) => 
    current.value < min.value ? current : min
  );

  // Map need values to emotions
  if (lowestNeed.value <= 15) {
    switch (lowestNeed.type) {
      case "hunger": return "/pet/Defeated.png";
      case "happiness": return "/pet/Sad.png";
      case "cleanliness": return "/pet/Confused.png";
      case "affection": return "/pet/Scared.png";
      case "spirit": return "/pet/Tired.png";
      default: return "/pet/Neutral.png";
    }
  } else if (lowestNeed.value <= 35) {
    return "/pet/Sad.png";
  } else if (lowestNeed.value >= 50) {
    return "/pet/Happy.png";
  } else if (pet.affection >= 85) {
    return "/pet/Love.png";
  }

  return "/pet/Neutral.png";
};

const getRandomToyPhrase = (toy: ToyInventoryItem | null): string => {
  if (!toy || !toy.phrases || toy.phrases.length === 0) {
    return "This is fun!";
  }
  return toy.phrases[Math.floor(Math.random() * toy.phrases.length)];
};

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

  const moodPhrase = isPlaying && activeToy ? getRandomToyPhrase(activeToy) : getPetMoodPhrase(pet);
  const petImage = getPetImage(pet, isPlaying);

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
      <CoinDisplay coins={100} />
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
            className={`toy left ${isPlaying ? 'playing' : ''}`}
          />
        )}
        <img 
          src={petImage}
          alt="Your Pet" 
          className={`petHero ${isPlaying ? 'playing' : ''}`} 
        />
        {activeToy && toyPosition === 'right' && (
          <img 
            src={activeToy.src} 
            alt={activeToy.name} 
            className={`toy right ${isPlaying ? 'playing' : ''}`}
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
