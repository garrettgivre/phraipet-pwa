// src/pages/PetPage.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Pet, Need, NeedInfo } from "../types.ts";
import { useToyAnimation } from "../contexts/ToyAnimationContext";
import { useDecoration } from "../contexts/DecorationContext";
import { useCoins } from "../contexts/CoinsContext";
import "./PetPage.css";
import CoinDisplay from "../components/CoinDisplay";
import PetRoom from "../components/PetRoom";
import PetNeedsDisplay from "../components/PetNeedsDisplay";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { getRandomMoodPhrase, getRandomToyPhrase } from "../utils/petPhrases";
import { usePetMovement } from "../hooks/usePetMovement";
import { getPetImage } from "../utils/petImageSelector";

interface PetPageProps {
  pet: Pet | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => void;
}

export default function PetPage({ pet, needInfo, onIncreaseAffection }: PetPageProps) {
  const { roomLayers, roomLayersLoading } = useDecoration();
  const { activeToy, isPlaying } = useToyAnimation();
  const { coins } = useCoins();
  const navigate = useNavigate();
  const { position, isWalking, walkingStep, isFacingRight } = usePetMovement(pet);
  const [foodItem, setFoodItem] = useState<{ src: string; position: number; hungerRestored?: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFoodItem, setPendingFoodItem] = useState<{ src: string; position: number; hungerRestored?: number } | null>(null);
  const [currentMoodPhrase, setCurrentMoodPhrase] = useState<string | undefined>(undefined);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [localHungerValue, setLocalHungerValue] = useState<number | null>(null);
  
  // Initialize local hunger value when pet changes
  useEffect(() => {
    if (pet && typeof pet.hunger === 'number') {
      setLocalHungerValue(pet.hunger);
    }
  }, [pet?.hunger]);
  
  // Get the current hunger value to display (either local animated value or from pet data)
  const currentHungerValue = localHungerValue !== null ? localHungerValue : (pet?.hunger || 0);
  
  // Create a modified needInfo array with our local hunger value
  const modifiedNeedInfo = needInfo.map(need => {
    if (need.need === "hunger" && localHungerValue !== null) {
      return { ...need, value: currentHungerValue };
    }
    return need;
  });

  // Handle each bite of food
  const handleFoodBite = (biteNumber: number, hungerAmount: number) => {
    console.log(`Food bite ${biteNumber}, hunger amount: ${hungerAmount}`);
    
    // Get the base hunger value to increment from
    const baseHunger = pet?.hunger || 0;
    
    // Calculate the progressive hunger value
    const progressiveHunger = Math.min(
      120, // MAX_NEED_VALUE from App.tsx
      baseHunger + (hungerAmount * biteNumber)
    );
    
    // Update local hunger display value
    setLocalHungerValue(progressiveHunger);
    
    // Add speech bubble for first bite but don't interfere with animation
    if (biteNumber === 1) {
      setCurrentMoodPhrase("Mmm, tasty!");
      setShowSpeechBubble(true);
      setTimeout(() => setShowSpeechBubble(false), 2000);
    }
    // Add different speech bubble for last bite
    else if (biteNumber === 3) {
      setCurrentMoodPhrase("That was delicious!");
      setShowSpeechBubble(true);
      setTimeout(() => setShowSpeechBubble(false), 2000);
    }
  };

  // Check for pending food item in localStorage when component mounts
  useEffect(() => {
    const storedFoodItem = localStorage.getItem('pendingFoodItem');
    if (storedFoodItem) {
      try {
        const parsedItem = JSON.parse(storedFoodItem);
        // Place the food in front of the pet
        setFoodItem({
          ...parsedItem,
          position: position + (isFacingRight ? -5 : 5)
        });
        // Clear the localStorage item
        localStorage.removeItem('pendingFoodItem');
      } catch (error) {
        console.error('Error parsing pending food item:', error);
        localStorage.removeItem('pendingFoodItem');
      }
    }
  }, [position, isFacingRight]);

  // Update mood phrase less frequently
  useEffect(() => {
    // Update mood phrase every 10-15 seconds
    const updateMoodPhrase = () => {
      const newPhrase = isPlaying && activeToy 
        ? getRandomToyPhrase(activeToy) 
        : getRandomMoodPhrase(pet);
      
      if (newPhrase) {
        setCurrentMoodPhrase(newPhrase);
        setShowSpeechBubble(true);
        
        // Hide speech bubble after 5-8 seconds
        const hideTimeout = setTimeout(() => {
          setShowSpeechBubble(false);
        }, 5000 + Math.random() * 3000);
        
        return () => clearTimeout(hideTimeout);
      }
    };
    
    // Initial update
    updateMoodPhrase();
    
    // Set interval for updates
    const interval = setInterval(() => {
      // Only 30% chance to show a new phrase
      if (Math.random() < 0.3) {
        updateMoodPhrase();
      }
    }, 10000 + Math.random() * 5000);
    
    return () => clearInterval(interval);
  }, [pet, isPlaying, activeToy]);

  const petImage = getPetImage(pet, isPlaying, isWalking, walkingStep, showSpeechBubble);

  const currentCeiling = roomLayers?.ceiling || "/assets/ceilings/classic-ceiling.png";
  const currentWall = roomLayers?.wall || "/assets/walls/classic-wall.png";
  const currentFloor = roomLayers?.floor || "/assets/floors/classic-floor.png";
  const currentTrim = roomLayers?.trim || "";
  const overlaySrc = roomLayers?.overlay || "";

  const handleNeedClick = (needType: Need) => {
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

  const handleFoodEaten = () => {
    // Reset local hunger value
    setLocalHungerValue(null);
    // Clear the food item
    setFoodItem(null);
  };

  const confirmUseFood = () => {
    if (pendingFoodItem) {
      setFoodItem({
        ...pendingFoodItem,
        position: position + (isFacingRight ? -5 : 5)
      });
      setShowConfirmDialog(false);
      setPendingFoodItem(null);
    }
  };

  const cancelUseFood = () => {
    setShowConfirmDialog(false);
    setPendingFoodItem(null);
  };

  return (
    <div className={`petPage ${!roomLayersLoading ? 'loaded' : ''}`} key={currentFloor + currentWall}>
      <CoinDisplay coins={coins} />
      
      <PetRoom
        floor={currentFloor}
        wall={currentWall}
        ceiling={currentCeiling}
        trim={currentTrim}
        decor={roomLayers?.decor || []}
        overlay={overlaySrc}
        petImage={petImage}
        petPosition={position}
        moodPhrase={showSpeechBubble ? currentMoodPhrase : undefined}
        activeToy={activeToy}
        isPlaying={isPlaying}
        foodItem={foodItem}
        onFoodEaten={handleFoodEaten}
        onFoodBite={handleFoodBite}
        isWalking={isWalking}
        isFacingRight={isFacingRight}
      />

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Use Food Item"
        message="Would you like to give this food to your pet?"
        onConfirm={confirmUseFood}
        onCancel={cancelUseFood}
      />

      <PetNeedsDisplay needInfo={modifiedNeedInfo} onNeedClick={handleNeedClick} />

      <div className="paintbrush-icon" onClick={() => navigate("/decorations")}>
        <img src="/assets/icons/paintbrush.png" alt="Room Decorations" />
      </div>
    </div>
  );
}