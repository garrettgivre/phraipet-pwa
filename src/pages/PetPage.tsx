// src/pages/PetPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import { useToyAnimation } from "../contexts/ToyAnimationContext";
import type { NeedInfo, Pet as PetType, Need as NeedType } from "../types";
import "./PetPage.css";
import CoinDisplay from "../components/CoinDisplay";
import PetRoom from "../components/PetRoom";
import PetNeedsDisplay from "../components/PetNeedsDisplay";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { getRandomMoodPhrase, getRandomToyPhrase } from "../utils/petPhrases";
import { usePetMovement } from "../hooks/usePetMovement";
import { getPetImage } from "../utils/petImageSelector";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => void;
}

export default function PetPage({ pet, needInfo, onIncreaseAffection }: PetPageProps) {
  const { roomLayers, roomLayersLoading } = useInventory();
  const { activeToy, isPlaying } = useToyAnimation();
  const navigate = useNavigate();
  const { position, isWalking, walkingStep, isFacingRight } = usePetMovement(pet);
  const [foodItem, setFoodItem] = useState<{ src: string; position: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFoodItem, setPendingFoodItem] = useState<{ src: string; position: number } | null>(null);

  const moodPhrase = isPlaying && activeToy ? getRandomToyPhrase(activeToy) : getRandomMoodPhrase(pet);
  const petImage = getPetImage(pet, isPlaying, isWalking, walkingStep);

  const currentCeiling = roomLayers?.ceiling || "/assets/ceilings/classic-ceiling.png";
  const currentWall = roomLayers?.wall || "/assets/walls/classic-wall.png";
  const currentFloor = roomLayers?.floor || "/assets/floors/classic-floor.png";
  const currentTrim = roomLayers?.trim || "";
  const overlaySrc = roomLayers?.overlay || "";

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

  const handleFoodEaten = () => {
    setFoodItem(null);
  };

  const confirmUseFood = () => {
    if (pendingFoodItem) {
      setFoodItem(pendingFoodItem);
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
      <CoinDisplay coins={100} />
      
      <PetRoom
        floor={currentFloor}
        wall={currentWall}
        ceiling={currentCeiling}
        trim={currentTrim}
        decor={roomLayers?.decor || []}
        overlay={overlaySrc}
        petImage={petImage}
        petPosition={position}
        moodPhrase={moodPhrase}
        activeToy={activeToy}
        isPlaying={isPlaying}
        isFacingRight={isFacingRight}
        foodItem={foodItem}
        onFoodEaten={handleFoodEaten}
      />

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Use Food Item"
        message="Would you like to give this food to your pet?"
        onConfirm={confirmUseFood}
        onCancel={cancelUseFood}
      />

      <PetNeedsDisplay needInfo={needInfo} onNeedClick={handleNeedClick} />

      <div className="paintbrush-icon" onClick={() => navigate("/inventory")}>
        <img src="/assets/icons/paintbrush.png" alt="Customize Room" />
      </div>
    </div>
  );
}