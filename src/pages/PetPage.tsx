// src/pages/PetPage.tsx
import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import { useToyAnimation } from "../contexts/ToyAnimationContext";
import type { NeedInfo, Pet as PetType, Need as NeedType, ToyInventoryItem } from "../types";
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";
import { useState, useEffect } from "react";
import CoinDisplay from "../components/CoinDisplay";
import PetRoom from "../components/PetRoom";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => void;
}

const getPetImage = (pet: PetType | null, isPlaying: boolean, isWalking: boolean, walkingStep: number): string => {
  if (!pet) return "/pet/Neutral.png";
  
  // Always use Happy image when playing with toy
  if (isPlaying) return "/pet/Happy.png";

  // Use walking animation when moving
  if (isWalking) {
    return walkingStep === 0 ? "/pet/Walk-Sideways-A.png" : "/pet/Walk-Sideways-B.png";
  }

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
  const [petPosition, setPetPosition] = useState(() => {
    const savedPosition = localStorage.getItem('petPosition');
    return savedPosition ? parseFloat(savedPosition) : 50;
  });
  const [isWalking, setIsWalking] = useState(false);
  const [walkingStep, setWalkingStep] = useState(0);
  const [isFacingRight, setIsFacingRight] = useState(true);

  // Add pet movement logic
  useEffect(() => {
    if (!pet) return;

    const moveInterval = setInterval(() => {
      setPetPosition(prevPos => {
        // Determine direction based on current position
        let direction;
        if (prevPos <= 15) {
          // If near left edge, move right
          direction = 1;
        } else if (prevPos >= 85) {
          // If near right edge, move left
          direction = -1;
        } else {
          // Otherwise, randomly choose direction
          direction = Math.random() > 0.5 ? 1 : -1;
        }

        // Calculate new position with a larger movement range
        const movementAmount = 5 + (Math.random() * 5); // Move 5-10% of screen width
        const newPos = prevPos + (direction * movementAmount);
        
        // Keep pet within bounds (10% to 90% of screen width)
        const boundedPos = Math.max(10, Math.min(90, newPos));
        localStorage.setItem('petPosition', boundedPos.toString());
        
        // Update walking state and direction
        setIsWalking(true);
        setIsFacingRight(direction > 0);
        
        // Calculate number of steps based on distance
        const distance = Math.abs(boundedPos - prevPos);
        const stepsPerPixel = 0.5; // Adjust this value to control animation speed
        const totalSteps = Math.floor(distance * stepsPerPixel);
        
        // Start walking animation
        let currentStep = 0;
        const walkInterval = setInterval(() => {
          if (currentStep < totalSteps) {
            setWalkingStep(currentStep % 2);
            currentStep++;
          } else {
            clearInterval(walkInterval);
            setIsWalking(false);
            setWalkingStep(0);
          }
        }, 200); // Adjust timing between steps
        
        return boundedPos;
      });
    }, 3000); // Move every 3 seconds

    return () => clearInterval(moveInterval);
  }, [pet]);

  const moodPhrase = isPlaying && activeToy ? getRandomToyPhrase(activeToy) : getPetMoodPhrase(pet);
  const petImage = getPetImage(pet, isPlaying, isWalking, walkingStep);

  const currentCeiling = roomLayers?.ceiling || "/assets/ceilings/classic-ceiling.png";
  const currentWall = roomLayers?.wall || "/assets/walls/classic-wall.png";
  const currentFloor = roomLayers?.floor || "/assets/floors/classic-floor.png";
  const currentTrim = roomLayers?.trim || "";
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
      
      <PetRoom
        floor={currentFloor}
        wall={currentWall}
        ceiling={currentCeiling}
        trim={currentTrim}
        decor={roomLayers?.decor || []}
        overlay={overlaySrc}
        petImage={petImage}
        petPosition={petPosition}
        moodPhrase={moodPhrase}
        activeToy={activeToy}
        isPlaying={isPlaying}
        isFacingRight={isFacingRight}
      />

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

      <div className="paintbrush-icon" onClick={() => navigate("/inventory")}>
        <img src="/assets/icons/paintbrush.png" alt="Customize Room" />
      </div>
    </div>
  );
}
