// src/pages/PetPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Pet, Need, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "../types.ts";
import { useToyAnimation } from "../contexts/ToyAnimationContext";
import { useDecoration } from "../contexts/DecorationContext";
import { useCoins } from "../contexts/CoinsContext";
import "./PetPage.css";
import CoinDisplay from "../components/CoinDisplay";
import PetRoom from "../components/PetRoom";
import PetNeedsDisplay from "../components/PetNeedsDisplay";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InlineRoomEditor from "../components/InlineRoomEditor";
import GroomingItem from "../components/GroomingItem";
import InlineInventoryPanel from "../components/InlineInventoryPanel";
import { getRandomMoodPhrase, getRandomToyPhrase } from "../utils/petPhrases";
import { usePetMovement } from "../hooks/usePetMovement";
import { getPetImage } from "../utils/petImageSelector";

interface PetPageProps {
  pet: Pet | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => void;
  onFeedPet: (item: FoodInventoryItem) => void;
  onGroomPet: (item: GroomingInventoryItem) => void;
  onPlayWithToy: (item: ToyInventoryItem) => void;
}

export default function PetPage({ pet, needInfo, onIncreaseAffection, onFeedPet, onGroomPet, onPlayWithToy }: PetPageProps) {
  const { roomLayers, roomLayersLoading } = useDecoration();
  const { activeToy, isPlaying } = useToyAnimation();
  const { coins } = useCoins();
  const navigate = useNavigate();
  const { position, isWalking, walkingStep, isFacingRight } = usePetMovement(pet);
  const [foodItem, setFoodItem] = useState<{ src: string; position: number; hungerRestored?: number } | null>(null);
  const [groomingItem, setGroomingItem] = useState<{ src: string; position: number; cleanlinessBoost?: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFoodItem, setPendingFoodItem] = useState<{ src: string; position: number; hungerRestored?: number } | null>(null);
  const [currentMoodPhrase, setCurrentMoodPhrase] = useState<string | undefined>(undefined);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [localHungerValue, setLocalHungerValue] = useState<number | null>(null);
  const [localCleanlinessValue, setLocalCleanlinessValue] = useState<number | null>(null);
  
  // New state for furniture edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  
  // New state for inventory panel
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventoryCategory, setInventoryCategory] = useState<"Food" | "Grooming" | "Toys">("Food");
  const [inventorySubCategory, setInventorySubCategory] = useState<string | undefined>(undefined);
  
  // Initialize local hunger value when pet changes
  useEffect(() => {
    if (pet && typeof pet.hunger === 'number') {
      setLocalHungerValue(pet.hunger);
    }
  }, [pet]);
  
  // Initialize local cleanliness value when pet changes
  useEffect(() => {
    if (pet && typeof pet.cleanliness === 'number') {
      setLocalCleanlinessValue(pet.cleanliness);
    }
  }, [pet]);
  
  // Get the current hunger value to display (either local animated value or from pet data)
  const currentHungerValue = localHungerValue !== null ? localHungerValue : (pet?.hunger || 0);
  
  // Get the current cleanliness value to display (either local animated value or from pet data)
  const currentCleanlinessValue = localCleanlinessValue !== null ? localCleanlinessValue : (pet?.cleanliness || 0);
  
  // Create a modified needInfo array with our local values
  const modifiedNeedInfo = needInfo.map(need => {
    if (need.need === "hunger" && localHungerValue !== null) {
      return { ...need, value: currentHungerValue };
    }
    if (need.need === "cleanliness" && localCleanlinessValue !== null) {
      return { ...need, value: currentCleanlinessValue };
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

  // Handle each grooming step
  const handleGroomingStep = (stepNumber: number, cleanlinessAmount: number) => {
    console.log(`Grooming step ${stepNumber}, cleanliness amount: ${cleanlinessAmount}`);
    
    // Get the base cleanliness value to increment from
    const baseCleanliness = pet?.cleanliness || 0;
    
    // Calculate the progressive cleanliness value
    const progressiveCleanliness = Math.min(
      120, // MAX_NEED_VALUE from App.tsx
      baseCleanliness + (cleanlinessAmount * stepNumber)
    );
    
    // Update local cleanliness display value
    setLocalCleanlinessValue(progressiveCleanliness);
    
    // Show speech bubble only once (for the first step)
    if (stepNumber === 1) {
      setCurrentMoodPhrase("Ahh, this feels so good!");
      setShowSpeechBubble(true);
      setTimeout(() => setShowSpeechBubble(false), 3000);
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

  // Check for pending grooming item in localStorage when component mounts
  useEffect(() => {
    const storedGroomingItem = localStorage.getItem('pendingGroomingItem');
    if (storedGroomingItem) {
      try {
        const parsedItem = JSON.parse(storedGroomingItem);
        // Place the grooming item near the pet
        setGroomingItem({
          ...parsedItem,
          position: position + (isFacingRight ? -3 : 3)
        });
        // Clear the localStorage item
        localStorage.removeItem('pendingGroomingItem');
      } catch (error) {
        console.error('Error parsing pending grooming item:', error);
        localStorage.removeItem('pendingGroomingItem');
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
  
  // Get the front and back furniture items
  const frontDecor = roomLayers?.frontDecor || [];
  const backDecor = roomLayers?.backDecor || [];

  const handleNeedClick = (needType: Need) => {
    console.log(`Need circle clicked: ${needType}`);
    switch (needType) {
      case "affection":
        onIncreaseAffection(5);
        break;
      case "hunger":
        setInventoryCategory("Food");
        setInventorySubCategory("Snack");
        setIsInventoryOpen(true);
        break;
      case "cleanliness":
        setInventoryCategory("Grooming");
        setInventorySubCategory("BasicKit");
        setIsInventoryOpen(true);
        break;
      case "happiness":
        setInventoryCategory("Toys");
        setInventorySubCategory("Classic");
        setIsInventoryOpen(true);
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

  const handleGroomingComplete = () => {
    // Reset local cleanliness value
    setLocalCleanlinessValue(null);
    // Clear the grooming item
    setGroomingItem(null);
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
  
  // Toggle edit mode instead of navigating to decorations page
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  
  return (
    <div className={`pet-page ${isEditMode ? 'edit-mode' : ''}`}>
      <CoinDisplay coins={coins} className={isEditMode ? "edit-mode-coin-display" : ""} />
      
      <div className="pet-room-bordered-container">
        {/* Optional Tamagotchi-style title */}
        <div className="pet-room-title">PhRAI Pet</div>
        
        {/* Pet room area - fixed size portrait container */}
        <div className="pet-room-inner-container">
          {/* Render pet if loaded */}
          {pet && !roomLayersLoading && (
            <PetRoom
              floor={currentFloor}
              wall={currentWall}
              ceiling={currentCeiling}
              trim={currentTrim}
              frontDecor={frontDecor}
              backDecor={backDecor}
              overlay={overlaySrc}
              petImage={petImage}
              petPosition={position}
              moodPhrase={showSpeechBubble ? currentMoodPhrase : undefined}
              activeToy={activeToy}
              isPlaying={isPlaying}
              isWalking={isWalking}
              isFacingRight={isFacingRight}
              foodItem={foodItem}
              onFoodEaten={handleFoodEaten}
              onFoodBite={handleFoodBite}
              constrainToRoom={true}
            />
          )}
          
          {/* Grooming Item Overlay */}
          {groomingItem && (
            <GroomingItem 
              key={`grooming-${groomingItem.src}`}
              src={groomingItem.src}
              position={groomingItem.position}
              cleanlinessBoost={groomingItem.cleanlinessBoost || 15}
              onGroomed={handleGroomingComplete}
              onGroomingStep={handleGroomingStep}
            />
          )}
          
          {/* Loading spinner if still loading */}
          {roomLayersLoading && (
            <div className="loading-spinner">
              Loading...
            </div>
          )}
        </div>
        
        {/* UI Elements in border area - Tamagotchi style */}
        <div className="pet-room-border-ui">
          {/* Paintbrush decoration button */}
          <button className="decoration-button" onClick={toggleEditMode}>
            <img src="/assets/icons/paintbrush.png" alt="Decorate Room" />
          </button>
          
          {/* Need indicator circles in Tamagotchi style */}
          <div className="need-indicators">
            <PetNeedsDisplay 
              needInfo={modifiedNeedInfo} 
              onNeedClick={handleNeedClick} 
            />
          </div>
        </div>
      </div>
      
      {/* Confirmation dialog for food */}
      {showConfirmDialog && (
        <ConfirmationDialog
          isOpen={showConfirmDialog}
          title="Feed Pet?"
          message="Would you like to feed this to your pet?"
          onConfirm={confirmUseFood}
          onCancel={cancelUseFood}
        />
      )}
      
      {/* Furniture Edit Overlay */}
      <InlineRoomEditor 
        isOpen={isEditMode}
        onClose={() => setIsEditMode(false)} 
        petImage={petImage}
        petPosition={position}
        moodPhrase={showSpeechBubble ? currentMoodPhrase : undefined}
        isFacingRight={isFacingRight}
      />
      
      {/* Inventory Panel */}
      <InlineInventoryPanel
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        pet={pet}
        onFeedPet={onFeedPet}
        onGroomPet={onGroomPet}
        onPlayWithToy={onPlayWithToy}
        initialCategory={inventoryCategory}
        initialSubCategory={inventorySubCategory}
      />
    </div>
  );
}