// src/pages/PetPage.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import type { Pet, Need, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "../types.ts";
import { useToyAnimation } from "../contexts/ToyAnimationContext";
import { useDecoration } from "../contexts/DecorationContext";
import { useCoins } from "../contexts/CoinsContext";
import "./PetPage.css";
import Header from "../components/Header";
import PetRoom from "../components/PetRoom";
import PetNeedsDisplay from "../components/PetNeedsDisplay";
import ConfirmationDialog from "../components/ConfirmationDialog";
import DecorStudio from "../components/DecorStudio";
// duplicate React import removed
import GroomingItem from "../components/GroomingItem";
import InlineInventoryPanel from "../components/InlineInventoryPanel";
import { getRandomMoodPhrase, getRandomToyPhrase } from "../utils/petPhrases";
import { usePetMovement } from "../hooks/usePetMovement";
import { getPetImage } from "../utils/petImageSelector";

interface PetPageProps {
  pet: Pet | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => Promise<void> | void;
  onFeedPet: (item: FoodInventoryItem) => Promise<void> | void;
  onGroomPet: (item: GroomingInventoryItem) => Promise<void> | void;
  onPlayWithToy: (item: ToyInventoryItem) => Promise<void> | void;
}

interface DustParticle {
  id: string;
  x: number;
  y: number;
}

export default function PetPage({ pet, needInfo, onIncreaseAffection, onFeedPet, onGroomPet, onPlayWithToy }: PetPageProps) {
  const { roomLayers, roomLayersLoading } = useDecoration();
  const { activeToy, isPlaying } = useToyAnimation();
  const { coins, crystals, updateCrystals } = useCoins();
  const { position, isWalking, walkingStep, isFacingRight, isTurning, isSquashing } = usePetMovement(pet, isPlaying);
  const [foodItem, setFoodItem] = useState<{ src: string; position: number; hungerRestored?: number } | null>(null);
  const [groomingItem, setGroomingItem] = useState<{ src: string; position: number; cleanlinessBoost?: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFoodItem, setPendingFoodItem] = useState<{ src: string; position: number; hungerRestored?: number } | null>(null);
  const [currentMoodPhrase, setCurrentMoodPhrase] = useState<string | undefined>(undefined);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [localHungerValue, setLocalHungerValue] = useState<number | null>(null);
  const [localCleanlinessValue, setLocalCleanlinessValue] = useState<number | null>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventoryCategory, setInventoryCategory] = useState<"Food" | "Grooming" | "Toys">("Food");
  const [inventorySubCategory, setInventorySubCategory] = useState<string | undefined>(undefined);

  // Crystal Dust Mechanic
  const [dustParticles, setDustParticles] = useState<DustParticle[]>(() => {
    try {
      const saved = localStorage.getItem('crystalDustParticles');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('crystalDustParticles', JSON.stringify(dustParticles));
  }, [dustParticles]);

  useEffect(() => {
    // Check for dust drop based on happiness level
    // Calculate interval based on pet's happiness (if available)
    // 0 happiness = 10 minutes (600000ms)
    // 50 happiness = 3 minutes (180000ms)
    // 100 happiness = 1 minute (60000ms)
    // Formula: Linear interpolation or steps
    
    // Using a simpler mapping for robustness:
    // High happiness (>80): 60s
    // Good happiness (50-80): 180s (3 mins)
    // Low happiness (<50): 600s (10 mins)
    const currentHappiness = pet?.happiness || 50; // Default to average if unknown
    
    let dropIntervalTime = 180000; // Default 3 mins
    if (currentHappiness > 80) {
      dropIntervalTime = 60000; // 1 min for very happy pets
    } else if (currentHappiness < 50) {
      dropIntervalTime = 600000; // 10 mins for unhappy pets
    }

    const dustInterval = setInterval(() => {
      // 100% chance to drop dust if less than 10 particles
      if (dustParticles.length < 10) {
        const newParticle: DustParticle = {
          id: Date.now().toString() + Math.random().toString(),
          x: 20 + Math.random() * 60, // 20% to 80% width (keep away from edges)
          y: 15 + Math.random() * 15, // 15% to 30% from bottom (keep on floor)
        };
        setDustParticles(prev => [...prev, newParticle]);
      }
    }, dropIntervalTime);

    return () => clearInterval(dustInterval);
  }, [dustParticles.length, pet?.happiness]);

  // Debug/Test: Ensure at least one particle spawns if none exist on load (so you can see it)
  useEffect(() => {
    if (dustParticles.length === 0) {
      const timer = setTimeout(() => {
        setDustParticles(prev => {
          if (prev.length === 0) {
            return [{
              id: "initial-" + Date.now(),
              x: 50,
              y: 20
            }];
          }
          return prev;
        });
      }, 1000); // 1 second delay after load
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCollectDust = (id: string) => {
    setDustParticles(prev => prev.filter(p => p.id !== id));
    void updateCrystals(1);
  };
  
  useEffect(() => {
    if (pet && typeof pet.hunger === 'number') { setLocalHungerValue(pet.hunger); }
  }, [pet]);
  
  useEffect(() => {
    if (pet && typeof pet.cleanliness === 'number') { setLocalCleanlinessValue(pet.cleanliness); }
  }, [pet]);
  
  const currentHungerValue = localHungerValue !== null ? localHungerValue : (pet?.hunger || 0);
  const currentCleanlinessValue = localCleanlinessValue !== null ? localCleanlinessValue : (pet?.cleanliness || 0);
  
  const modifiedNeedInfo = needInfo.map(need => {
    if (need.need === "hunger" && localHungerValue !== null) return { ...need, value: currentHungerValue };
    if (need.need === "cleanliness" && localCleanlinessValue !== null) return { ...need, value: currentCleanlinessValue };
    return need;
  });

  const handleFoodBite = (biteNumber: number, hungerAmount: number) => {
    const baseHunger = pet?.hunger || 0;
    const progressiveHunger = Math.min(120, baseHunger + (hungerAmount * biteNumber));
    setLocalHungerValue(progressiveHunger);
    if (biteNumber === 1) {
      setCurrentMoodPhrase("Mmm, tasty!");
      setShowSpeechBubble(true);
      window.setTimeout(() => setShowSpeechBubble(false), 2000);
    } else if (biteNumber === 3) {
      setCurrentMoodPhrase("That was delicious!");
      setShowSpeechBubble(true);
      window.setTimeout(() => setShowSpeechBubble(false), 2000);
    }
  };

  const handleGroomingStep = (stepNumber: number, cleanlinessAmount: number) => {
    const baseCleanliness = pet?.cleanliness || 0;
    const progressiveCleanliness = Math.min(120, baseCleanliness + (cleanlinessAmount * stepNumber));
    setLocalCleanlinessValue(progressiveCleanliness);
    if (stepNumber === 1) {
      setCurrentMoodPhrase("Ahh, this feels so good!");
      setShowSpeechBubble(true);
      window.setTimeout(() => setShowSpeechBubble(false), 3000);
    }
  };

  useEffect(() => {
    const checkPendingItems = () => {
      const storedFoodItem = localStorage.getItem('pendingFoodItem');
      if (storedFoodItem) {
        try {
          const parsedItem = JSON.parse(storedFoodItem) as { src: string; hungerRestored?: number; position?: number };
          // Prefer the position saved in the item, fall back to current calculated position
          const targetPos = parsedItem.position || ((position || 50) + (isFacingRight ? -5 : 5));
          setFoodItem({ ...parsedItem, position: targetPos });
          localStorage.removeItem('pendingFoodItem');
        } catch (error) {
          console.error('Error parsing pending food item:', error);
          localStorage.removeItem('pendingFoodItem');
        }
      }

      const storedGroomingItem = localStorage.getItem('pendingGroomingItem');
      if (storedGroomingItem) {
        try {
          const parsedItem = JSON.parse(storedGroomingItem) as { src: string; cleanlinessBoost?: number; position?: number };
           // Prefer the position saved in the item, fall back to current calculated position
          const targetPos = parsedItem.position || ((position || 50) + (isFacingRight ? -3 : 3));
          setGroomingItem({ ...parsedItem, position: targetPos });
          localStorage.removeItem('pendingGroomingItem');
        } catch (error) {
          console.error('Error parsing pending grooming item:', error);
          localStorage.removeItem('pendingGroomingItem');
        }
      }
    };

    // Check immediately
    checkPendingItems();

    // Listen for custom event from App.tsx
    window.addEventListener('pending-item-updated', checkPendingItems);
    
    return () => {
      window.removeEventListener('pending-item-updated', checkPendingItems);
    };
  }, [position, isFacingRight]);

  useEffect(() => {
    const updateMoodPhrase = () => {
      const newPhrase = isPlaying && activeToy ? getRandomToyPhrase(activeToy) : getRandomMoodPhrase(pet);
      if (newPhrase) {
        setCurrentMoodPhrase(newPhrase);
        setShowSpeechBubble(true);
        const hideTimeout = window.setTimeout(() => { setShowSpeechBubble(false); }, 5000 + Math.random() * 3000);
        return () => window.clearTimeout(hideTimeout);
      }
    };
    updateMoodPhrase();
    const interval = window.setInterval(() => { if (Math.random() < 0.3) updateMoodPhrase(); }, 10000 + Math.random() * 5000);
    return () => window.clearInterval(interval);
  }, [pet, isPlaying, activeToy]);

  const petImage = getPetImage(pet, isPlaying, isWalking, walkingStep, showSpeechBubble, isTurning);

  const currentCeiling = roomLayers?.ceiling || "/assets/ceilings/classic-ceiling.png";
  const currentWall = roomLayers?.wall || "/assets/walls/classic-wall.png";
  const currentFloor = roomLayers?.floor || "/assets/floors/classic-floor.png";
  const currentTrim = roomLayers?.trim || "";
  const overlaySrc = roomLayers?.overlay || "";
  
  const frontDecor = roomLayers?.frontDecor || [];
  const backDecor = roomLayers?.backDecor || [];

  const handleNeedClick = (needType: Need) => {
    switch (needType) {
      case "affection":
        void onIncreaseAffection(5);
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
        break;
      default:
        break;
    }
  };

  const handlePetClick = () => {
    void onIncreaseAffection(1);
    
    // Optional: show mood phrase randomly
    if (Math.random() < 0.3) {
      const phrases = ["<3", "Purr...", "Happy!", "Love you!"];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      setCurrentMoodPhrase(phrase);
      setShowSpeechBubble(true);
      window.setTimeout(() => setShowSpeechBubble(false), 2000);
    }
  };

  const handleFoodEaten = () => { setLocalHungerValue(null); setFoodItem(null); };
  const handleGroomingComplete = () => { setLocalCleanlinessValue(null); setGroomingItem(null); };

  const confirmUseFood = () => {
    if (pendingFoodItem) {
      setFoodItem({ ...pendingFoodItem, position: position + (isFacingRight ? -5 : 5) });
      setShowConfirmDialog(false);
      setPendingFoodItem(null);
    }
  };
  const cancelUseFood = () => { setShowConfirmDialog(false); setPendingFoodItem(null); };
  const toggleEditMode = () => { setIsEditMode(!isEditMode); };
  const navigate = useNavigate();
  const goToSettings = () => { navigate('/settings'); };
  
  // Decide which editor to render to avoid double overlays on mobile
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 600px)').matches : false
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Effect to handle navigation from NavBar to reset state
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/' && location.state && (location.state as any).reset) {
      setIsInventoryOpen(false);
      setIsEditMode(false);
      // Clear the state to prevent repeated resets if we stay on the page
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return (
    <div className={`pet-page ${isEditMode ? 'edit-mode' : ''}`}>
      <Header coins={coins} crystals={crystals} compact={true} onSettingsClick={goToSettings} />
      <div className="pet-room-bordered-container">
        <div className="pet-room-inner-container">
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
              moodPhrase={isEditMode ? undefined : (showSpeechBubble ? currentMoodPhrase : undefined)}
              activeToy={activeToy}
              isPlaying={isPlaying}
              isWalking={isWalking}
              isFacingRight={isFacingRight}
              isSquashing={isSquashing}
              foodItem={foodItem}
              onFoodEaten={handleFoodEaten}
              onFoodBite={handleFoodBite}
              constrainToRoom={true}
              crystals={dustParticles}
              onCollectCrystal={handleCollectDust}
              onPetClick={handlePetClick}
            />
          )}
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
          {roomLayersLoading && <div className="loading-spinner">Loading...</div>}
        </div>
        <div className="pet-room-border-ui">
          <button className="decoration-button" onClick={toggleEditMode}>
            <img src="/assets/icons/paintbrush.png" alt="Decorate Room" />
          </button>
          <div className="need-indicators">
            <PetNeedsDisplay needInfo={modifiedNeedInfo} onNeedClick={handleNeedClick} />
          </div>
        </div>
      </div>
      {showConfirmDialog && (
        <ConfirmationDialog isOpen={showConfirmDialog} title="Feed Pet?" message="Would you like to feed this to your pet?" onConfirm={confirmUseFood} onCancel={cancelUseFood} />
      )}
      <DecorStudio isOpen={isEditMode} onClose={() => setIsEditMode(false)} />
      <InlineInventoryPanel isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} pet={pet} onFeedPet={(i) => { void onFeedPet(i); }} onGroomPet={(i) => { void onGroomPet(i); }} onPlayWithToy={(i) => { void onPlayWithToy(i); }} initialCategory={inventoryCategory} initialSubCategory={inventorySubCategory} />
    </div>
  );
}