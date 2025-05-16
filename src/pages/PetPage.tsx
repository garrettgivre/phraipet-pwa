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

const getPetImage = (pet: PetType | null, isPlaying: boolean, isWalking: boolean, walkFrame: number): string => {
  if (!pet) return "/pet/Neutral.png";
  
  // Always use Happy image when playing with toy
  if (isPlaying) return "/pet/Happy.png";

  // Check for overstuffed condition first
  if (pet.hunger >= 100) return "/pet/Neutral.png";

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
      case "hunger": return "/pet/Sad.png";
      case "happiness": return "/pet/Sad.png";
      case "cleanliness": return "/pet/Confused.png";
      case "affection": return "/pet/Sad.png";
      case "spirit": return "/pet/Neutral.png";
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
  const [isWalking, setIsWalking] = useState(false);
  const [walkDirection, setWalkDirection] = useState<'left' | 'right'>('right');
  const [walkFrame, setWalkFrame] = useState(0);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [petPosition, setPetPosition] = useState(() => {
    const savedPosition = localStorage.getItem('petPosition');
    return savedPosition ? parseFloat(savedPosition) : 50;
  });

  // Handle walking animation frame
  useEffect(() => {
    if (isWalking) {
      const frameInterval = setInterval(() => {
        setWalkFrame(prev => (prev + 1) % 2); // Toggle between 0 and 1
      }, 300); // Switch frames every 300ms
      return () => clearInterval(frameInterval);
    }
  }, [isWalking]);

  // Handle random walking
  useEffect(() => {
    if (isPlaying) return;

    const startWalking = () => {
      if (Math.random() < 0.3) {
        setIsWalking(true);
        const newDirection = Math.random() < 0.5 ? 'left' : 'right';
        setWalkDirection(newDirection);
        
        // Calculate random walk distance between 10% and 30% of screen width
        const walkDistance = Math.random() * 20 + 10;
        const newPosition = newDirection === 'left' 
          ? Math.max(20, petPosition - walkDistance) // Keep at least 20% from left edge
          : Math.min(80, petPosition + walkDistance); // Keep at least 20% from right edge
        
        setPetPosition(newPosition);
      }
    };

    const stopWalking = () => {
      setIsWalking(false);
    };

    const walkTimer = setTimeout(startWalking, Math.random() * 10000 + 5000);
    const stopTimer = setTimeout(stopWalking, Math.random() * 2000 + 3000);

    return () => {
      clearTimeout(walkTimer);
      clearTimeout(stopTimer);
    };
  }, [isPlaying, isWalking, petPosition]);

  const moodPhrase = isPlaying && activeToy ? getRandomToyPhrase(activeToy) : getPetMoodPhrase(pet);
  const petImage = isWalking 
    ? `/pet/Walk-Sideways${walkFrame === 0 ? 'A' : 'B'}.png` 
    : getPetImage(pet, isPlaying, isWalking, walkFrame);

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
        {pet && moodPhrase && showSpeechBubble && (
          <div 
            className="pet-mood-bubble"
            style={{
              position: 'absolute',
              left: `${petPosition}%`,
              transform: 'translateX(-50%)',
              top: '-60px'
            }}
          >
            <p>{moodPhrase}</p>
          </div>
        )}
        {activeToy && toyPosition === 'left' && (
          <img 
            src={activeToy.src} 
            alt={activeToy.name} 
            className={`toy left ${isPlaying ? 'playing' : ''}`}
            style={{ position: 'absolute', left: `${petPosition - 15}%` }}
          />
        )}
        <img 
          src={petImage}
          alt="Your Pet" 
          className={`petHero ${isPlaying ? 'playing' : ''} ${isWalking ? 'walking' : ''} ${walkDirection === 'left' ? 'flip' : ''}`}
          style={{ 
            left: `${petPosition}%`,
            transform: `translateX(-50%) ${walkDirection === 'left' ? 'scaleX(-1)' : ''}`
          }}
        />
        {activeToy && toyPosition === 'right' && (
          <img 
            src={activeToy.src} 
            alt={activeToy.name} 
            className={`toy right ${isPlaying ? 'playing' : ''}`}
            style={{ position: 'absolute', left: `${petPosition + 15}%` }}
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
