// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import type { Pet, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "./types";
import { InventoryProvider } from "./contexts/InventoryContext";
import { DecorationProvider } from "./contexts/DecorationContext";
import { ToyAnimationProvider, useToyAnimation } from "./contexts/ToyAnimationContext";
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { petService, withErrorHandling } from "./services/firebase";
import { createRoutes } from "./routes";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import { CoinsProvider, useCoins } from './contexts/CoinsContext';
import { clampNeed, computeSpirit, describeNeed, applyNeedsDecay, MAX_NEED_VALUE, getTodayDateString, defaultPetData, validatePet, getDefaultPet } from './utils/pet'

const AFFECTION_DAILY_GAIN_CAP = 20;
const HUNGER_DECAY_PER_DAY = 100;
const HAPPINESS_DECAY_PER_DAY = 50;
const CLEANLINESS_DECAY_PER_DAY = 100;
const AFFECTION_DECAY_PER_DAY = 10;

const isDev = import.meta.env.DEV;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

interface AppShellProps {
  pet: Pet | null;
  handleFeedPet: (foodItem: FoodInventoryItem) => void;
  handleGroomPet: (groomingItem: GroomingInventoryItem) => void;
  handlePlayWithToy: (toyItem: ToyInventoryItem) => void;
  handleIncreaseAffection: (amount: number) => void;
  needInfo: NeedInfo[];
}

function AppShell({ pet, handleFeedPet, handleGroomPet, handlePlayWithToy, handleIncreaseAffection, needInfo }: AppShellProps) {
  const location = useLocation();
  const isPetPage = location.pathname === "/";
  const { coins, crystals } = useCoins();

  if (isDev) {
    console.log("AppShell - Current location:", location.pathname);
    console.log("AppShell - isPetPage:", isPetPage);
    console.log("AppShell - needInfo:", needInfo);
    console.log("AppShell - needInfo length:", needInfo.length);
  }

  const routes = createRoutes({
    pet,
    handleFeedPet,
    handleGroomPet,
    handlePlayWithToy,
    handleIncreaseAffection,
    needInfo
  });

  if (isDev) {
    console.log("Available routes:", routes.map(r => r.path));
  }

  return (
    <>
      <ScrollToTop />
      {!isPetPage && ( <Header coins={coins} crystals={crystals} needs={needInfo} /> )}
      <main style={{
        paddingTop: isPetPage ? "0px" : "0px",
        paddingBottom: "var(--nav-height)",
        height: "100vh",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
        maxHeight: "100vh",
        maxWidth: "100vw"
      }}>
        <ErrorBoundary>
          <Routes>
            {routes.map((route, index) => (
              route.children ? (
                <Route key={index} path={route.path} element={route.element}>
                  {route.children.map((childRoute, childIndex) => (
                    <Route 
                      key={`${index}-${childIndex}`} 
                      path={childRoute.path} 
                      element={childRoute.element} 
                    />
                  ))}
                </Route>
              ) : (
              <Route key={index} path={route.path} element={route.element} />
              )
            ))}
          </Routes>
        </ErrorBoundary>
      </main>
      <NavBar />
    </>
  );
}


function AppContent() {
  const [pet, setPet] = useState<Pet | null>(getDefaultPet);
  const { setActiveToy, setIsPlaying } = useToyAnimation();
  const navigate = useNavigate();

  const needInfo: NeedInfo[] = pet && typeof pet.hunger === 'number' && typeof pet.cleanliness === 'number' && typeof pet.happiness === 'number' && typeof pet.affection === 'number' && typeof pet.spirit === 'number'
    ? [
        { need: "hunger", name: "Hunger", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/hunger.png", value: pet.hunger, desc: describeNeed("hunger", pet.hunger) },
        { need: "cleanliness", name: "Cleanliness", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/cleanliness.png", value: pet.cleanliness, desc: describeNeed("cleanliness", pet.cleanliness) },
        { need: "happiness", name: "Happiness", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/happiness.png", value: pet.happiness, desc: describeNeed("happiness", pet.happiness) },
        { need: "affection", name: "Affection", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/affection.png", value: pet.affection, desc: describeNeed("affection", pet.affection) },
        { need: "spirit", name: "Spirit", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/spirit.png", value: pet.spirit, desc: describeNeed("happiness", pet.spirit) },
      ]
    : [];

  if (isDev) {
    console.log("Pet data:", pet);
    console.log("Need info:", needInfo);
    console.log("Need info length:", needInfo.length);
  }

  const handleFeedPet = async (foodItem: FoodInventoryItem) => {
    if (!pet || typeof pet.hunger !== 'number') return;
    const newHunger = clampNeed(pet.hunger + (foodItem.hungerRestored || foodItem.hungerBoost));
    const updatedPet = {
      ...pet,
      hunger: newHunger,
      lastNeedsUpdateTime: Date.now(),
      spirit: computeSpirit({ hunger: newHunger, happiness: pet.happiness, cleanliness: pet.cleanliness, affection: pet.affection })
    };
    setPet(updatedPet);
    localStorage.setItem('pendingFoodItem', JSON.stringify({
      src: foodItem.src,
      position: pet.xPosition || 50, // Use current position immediately
      hungerRestored: foodItem.hungerBoost
    }));
    // Don't navigate if we are already on home (prevents remounting/flashing)
    if (window.location.pathname !== '/') {
      void navigate('/');
    } else {
      // If already on home, we might need to manually trigger the storage event check or state update
      // Since we are in the same context, we can't easily force the other component to re-render 
      // via local storage event in the same window.
      // However, PetPage reads on mount/update. 
      // If PetPage is already mounted, it won't see this unless we trigger it.
      // But AppShell handles routing.
      
      // Force a "soft reload" of PetPage state if possible, or just let the user see it.
      // Actually, since we are setting state in AppShell, PetPage might re-render if it receives props.
      // But pendingFoodItem is read from localStorage in useEffect.
      
      // Dispatch a custom event to notify PetPage
      window.dispatchEvent(new Event('pending-item-updated'));
    }
    await withErrorHandling(
      () => petService.updatePetNeeds(updatedPet),
      "Failed to update pet hunger"
    );
  };

  const handleGroomPet = async (groomingItem: GroomingInventoryItem) => {
    if (!pet || typeof pet.cleanliness !== 'number') return;
    const newCleanliness = clampNeed(pet.cleanliness + groomingItem.cleanlinessBoost);
    const updatedPet: Pet = {
      ...pet,
      cleanliness: newCleanliness,
      lastNeedsUpdateTime: Date.now(),
      spirit: computeSpirit({ hunger: pet.hunger, happiness: pet.happiness, cleanliness: newCleanliness, affection: pet.affection })
    };
    setPet(updatedPet);
    localStorage.setItem('pendingGroomingItem', JSON.stringify({
      src: groomingItem.src,
      position: pet.xPosition || 50,
      cleanlinessBoost: groomingItem.cleanlinessBoost
    }));
    
    if (window.location.pathname !== '/') {
      void navigate('/');
    } else {
      window.dispatchEvent(new Event('pending-item-updated'));
    }
    await withErrorHandling(
      () => petService.updatePetNeeds(updatedPet),
      "Failed to update pet cleanliness"
    );
  };

  const handlePlayWithToy = async (toyItem: ToyInventoryItem) => {
    if (!pet || typeof pet.happiness !== 'number') return;
    const newHappiness = clampNeed(pet.happiness + toyItem.happinessBoost);
    const updates: Partial<Pet> = {
      happiness: newHappiness,
      hunger: pet.hunger,
      cleanliness: pet.cleanliness,
      spirit: computeSpirit({ hunger: pet.hunger, happiness: newHappiness, cleanliness: pet.cleanliness, affection: pet.affection })
    };
    setActiveToy(toyItem);
    setIsPlaying(true);
    void navigate('/');
    setTimeout(() => {
      setIsPlaying(false);
      setActiveToy(null);
    }, 5000);
    await withErrorHandling(
      () => petService.updatePetNeeds(updates),
      "Failed to update pet happiness"
    );
  };

  const handleIncreaseAffection = async (amount: number) => {
    if (!pet) return;
    const currentPetData = { ...pet };
    const todayStr = getTodayDateString();
    if (currentPetData.lastAffectionGainDate !== todayStr) {
      currentPetData.affectionGainedToday = 0;
      currentPetData.lastAffectionGainDate = todayStr;
    }
    const currentGainedToday = currentPetData.affectionGainedToday || 0;
    if (currentGainedToday >= AFFECTION_DAILY_GAIN_CAP) {
      if (isDev) console.log("Affection daily cap reached.");
      await withErrorHandling(
        () => petService.updatePetNeeds({ lastNeedsUpdateTime: Date.now() }),
        "Failed to update pet affection"
      );
      return;
    }
    const gainableAmount = Math.min(amount, AFFECTION_DAILY_GAIN_CAP - currentGainedToday);
    if (gainableAmount <= 0) {
      await withErrorHandling(
        () => petService.updatePetNeeds({ lastNeedsUpdateTime: Date.now() }),
        "Failed to update pet affection"
      );
      return;
    }
    const newAffection = clampNeed((currentPetData.affection || 0) + gainableAmount);
    const newAffectionGainedToday = currentGainedToday + gainableAmount;
    const updates: Partial<Pet> = {
      affection: newAffection,
      affectionGainedToday: newAffectionGainedToday,
      lastAffectionGainDate: todayStr,
      spirit: computeSpirit({ hunger: currentPetData.hunger, happiness: currentPetData.happiness, cleanliness: currentPetData.cleanliness, affection: newAffection })
    };
    await withErrorHandling(
      () => petService.updatePetNeeds(updates),
      "Failed to update pet affection"
    );
  };

  const hasInitialPetRef = useRef<boolean>(false);

  useEffect(() => {
    if (isDev) console.log("Setting up pet subscription...");
    const fallbackTimeout = setTimeout(() => {
      if (!hasInitialPetRef.current) {
        if (isDev) console.log("Pet loading timeout, using default pet data");
        setPet(getDefaultPet());
      }
    }, 1500);

    const unsubscribe = petService.subscribeToPet((petData) => {
      if (isDev) console.log("Pet data received from Firebase:", petData);
      clearTimeout(fallbackTimeout);
      hasInitialPetRef.current = true;
      const currentTime = Date.now();
      let needsFirebaseUpdate = false;
      if (petData) {
        if (isDev) console.log("Processing pet data...");
        
        // Validate and normalize pet data using utility
        const processedPetData = validatePet(petData);
        
        // Check for day change to reset daily limits
        const todayStr = getTodayDateString();
        if (processedPetData.lastAffectionGainDate !== todayStr) {
          processedPetData.affectionGainedToday = 0;
          processedPetData.lastAffectionGainDate = todayStr;
          needsFirebaseUpdate = true;
        }
        
        const timeElapsedMs = currentTime - processedPetData.lastNeedsUpdateTime;
        if (timeElapsedMs > 1000) {
          needsFirebaseUpdate = true;
          const decayed = applyNeedsDecay(
            processedPetData,
            currentTime,
            {
              hungerPerDay: HUNGER_DECAY_PER_DAY,
              happinessPerDay: HAPPINESS_DECAY_PER_DAY,
              cleanlinessPerDay: CLEANLINESS_DECAY_PER_DAY,
              affectionPerDay: AFFECTION_DECAY_PER_DAY,
            }
          );
          processedPetData.hunger = decayed.hunger;
          processedPetData.happiness = decayed.happiness;
          processedPetData.cleanliness = decayed.cleanliness;
          processedPetData.affection = decayed.affection;
          processedPetData.spirit = decayed.spirit;
          processedPetData.lastNeedsUpdateTime = decayed.lastNeedsUpdateTime;
        }
        setPet(processedPetData);
        if (needsFirebaseUpdate) {
          void withErrorHandling(
            () => petService.updatePetNeeds(processedPetData),
            "Failed to update pet needs"
          );
        }
      } else {
        const newPet = getDefaultPet();
        setPet(newPet);
        void withErrorHandling(
          () => petService.updatePetNeeds(newPet),
          "Failed to initialize pet data"
        );
      }
    });

    return () => {
      clearTimeout(fallbackTimeout);
      unsubscribe();
    };
  }, []);

  const handleFeedPetVoid = (foodItem: FoodInventoryItem): void => { void handleFeedPet(foodItem); };
  const handleGroomPetVoid = (groomingItem: GroomingInventoryItem): void => { void handleGroomPet(groomingItem); };
  const handlePlayWithToyVoid = (toyItem: ToyInventoryItem): void => { void handlePlayWithToy(toyItem); };
  const handleIncreaseAffectionVoid = (amount: number): void => { void handleIncreaseAffection(amount); };

  return (
    <AppShell
      pet={pet}
      handleFeedPet={handleFeedPetVoid}
      handleGroomPet={handleGroomPetVoid}
      handlePlayWithToy={handlePlayWithToyVoid}
      handleIncreaseAffection={handleIncreaseAffectionVoid}
      needInfo={needInfo}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <InventoryProvider>
        <CoinsProvider>
      <ToyAnimationProvider>
        <DecorationProvider>
          <ThemeProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ThemeProvider>
        </DecorationProvider>
      </ToyAnimationProvider>
        </CoinsProvider>
      </InventoryProvider>
    </ErrorBoundary>
  );
}
