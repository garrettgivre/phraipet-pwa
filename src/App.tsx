// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import type { Pet, Need, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "./types";
import { InventoryProvider } from "./contexts/InventoryContext";
import { DecorationProvider } from "./contexts/DecorationContext";
import { ToyAnimationProvider, useToyAnimation } from "./contexts/ToyAnimationContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { petService, withErrorHandling } from "./services/firebase";
import { createRoutes } from "./routes";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import { CoinsProvider, useCoins } from './contexts/CoinsContext';

const MAX_NEED_VALUE = 120;
const MIN_NEED_VALUE = 0;
const AFFECTION_DAILY_GAIN_CAP = 20;
const MILLISECONDS_IN_HOUR = 60 * 60 * 1000;
const HUNGER_DECAY_PER_DAY = 100;
const HAPPINESS_DECAY_PER_DAY = 50;
const CLEANLINESS_DECAY_PER_DAY = 100;
const AFFECTION_DECAY_PER_DAY = 10;

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const bands: Record<Exclude<Need, "spirit">, { upTo: number; label: string }[]> = {
  hunger: [ { upTo: -21, label: "Dying" }, { upTo: -11, label: "Starving" }, { upTo: -1, label: "Famished" }, { upTo: 14, label: "Very Hungry" }, { upTo: 29, label: "Hungry" }, { upTo: 44, label: "Not Hungry" }, { upTo: 59, label: "Fine" }, { upTo: 74, label: "Satiated" }, { upTo: 89, label: "Full Up" }, { upTo: 104, label: "Very Full" }, { upTo: 119, label: "Bloated" }, { upTo: 120, label: "Very Bloated" }, ],
  happiness: [ { upTo: -21, label: "Miserable" }, { upTo: -11, label: "Sad" }, { upTo: -1, label: "Unhappy" }, { upTo: 14, label: "Dull" }, { upTo: 29, label: "Okay" }, { upTo: 44, label: "Content" }, { upTo: 59, label: "Happy" }, { upTo: 74, label: "Joyful" }, { upTo: 89, label: "Delighted" }, { upTo: 104, label: "Ecstatic" }, { upTo: 119, label: "Overjoyed" }, { upTo: 120, label: "Blissful" }, ],
  cleanliness: [ { upTo: -21, label: "Filthy" }, { upTo: -11, label: "Very Dirty" }, { upTo: -1, label: "Dirty" }, { upTo: 14, label: "Slightly Dirty" }, { upTo: 29, label: "Unkempt" }, { upTo: 44, label: "Decent" }, { upTo: 59, label: "Clean" }, { upTo: 74, label: "Very Clean" }, { upTo: 89, label: "Spotless" }, { upTo: 104, label: "Gleaming" }, { upTo: 119, label: "Pristine" }, { upTo: 120, label: "Radiant" }, ],
  affection: [ { upTo: -21, label: "Neglected" }, { upTo: -11, label: "Wary" }, { upTo: -1, label: "Distant" }, { upTo: 14, label: "Curious" }, { upTo: 29, label: "Friendly" }, { upTo: 44, label: "Affectionate" }, { upTo: 59, label: "Bonded" }, { upTo: 74, label: "Loyal" }, { upTo: 89, label: "Devoted" }, { upTo: 104, label: "Inseparable" }, { upTo: 119, label: "Loving" }, { upTo: 120, label: "Soulmates" }, ],
};

const descriptor = (need: Exclude<Need, "spirit">, value: number | undefined): string => {
  if (typeof value !== 'number' || isNaN(value)) return "Unknown";
  const needBand = bands[need];
  if (!needBand) { console.warn(`Descriptor bands not found for need: ${need}`); return "Undefined Need Type"; }
  return needBand.find((b) => value <= b.upTo)?.label ?? "Undefined State";
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
  const { coins } = useCoins();

  console.log("AppShell - Current location:", location.pathname);
  console.log("AppShell - isPetPage:", isPetPage);
  console.log("AppShell - needInfo:", needInfo);
  console.log("AppShell - needInfo length:", needInfo.length);

  // Get routes and log them for debugging
  const routes = createRoutes({
    pet,
    handleFeedPet,
    handleGroomPet,
    handlePlayWithToy,
    handleIncreaseAffection,
    needInfo
  });

  console.log("Available routes:", routes.map(r => r.path));

  return (
    <>
      <ScrollToTop />
      {!isPetPage && ( <Header coins={coins} needs={needInfo} /> )}
      <main style={{
        paddingTop: "0px",
        paddingBottom: "var(--nav-height)",
        height: "100%",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
        // Ensure content is properly contained
        maxHeight: "100%",
        maxWidth: "100vw"
      }}>
        <ErrorBoundary>
          <Routes>
            {routes.map((route, index) => (
              // Special handling for nested routes
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

const defaultPetData: Pet = {
  id: "default-pet",
  name: "Buddy",
  type: "default",
  hunger: 100, 
  happiness: 100, 
  cleanliness: 100, 
  affection: 50, 
  spirit: 0,
  image: "/pet/neutral.png", 
  lastNeedsUpdateTime: Date.now(),
  affectionGainedToday: 0, 
  lastAffectionGainDate: getTodayDateString(),
};
defaultPetData.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((defaultPetData.hunger + defaultPetData.happiness + defaultPetData.cleanliness + defaultPetData.affection) / 4)));

function AppContent() {
  const [pet, setPet] = useState<Pet | null>(defaultPetData);
  const { setActiveToy, setIsPlaying } = useToyAnimation();
  const navigate = useNavigate();

  const needInfo: NeedInfo[] = pet && typeof pet.hunger === 'number' && typeof pet.cleanliness === 'number' && typeof pet.happiness === 'number' && typeof pet.affection === 'number' && typeof pet.spirit === 'number'
    ? [
        { need: "hunger", name: "Hunger", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/hunger.png", value: pet.hunger, desc: descriptor("hunger", pet.hunger) },
        { need: "cleanliness", name: "Cleanliness", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/cleanliness.png", value: pet.cleanliness, desc: descriptor("cleanliness", pet.cleanliness) },
        { need: "happiness", name: "Happiness", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/happiness.png", value: pet.happiness, desc: descriptor("happiness", pet.happiness) },
        { need: "affection", name: "Affection", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/affection.png", value: pet.affection, desc: descriptor("affection", pet.affection) },
        { need: "spirit", name: "Spirit", maxValue: MAX_NEED_VALUE, color: "", iconSrc: "/assets/icons/needs/spirit.png", value: pet.spirit, desc: descriptor("happiness", pet.spirit) },
      ]
    : [];

  // Debug logging
  console.log("Pet data:", pet);
  console.log("Need info:", needInfo);
  console.log("Need info length:", needInfo.length);

  const handleFeedPet = async (foodItem: FoodInventoryItem) => {
    if (!pet || typeof pet.hunger !== 'number') return;
    
    // Create a toast or indication that feeding is occurring
    console.log(`Feeding pet ${foodItem.name}, hunger restored: ${foodItem.hungerBoost}`);
    
    // Calculate new hunger value - the higher the better for hunger
    let newHunger = Math.min(MAX_NEED_VALUE, pet.hunger + (foodItem.hungerRestored || foodItem.hungerBoost));
    newHunger = Math.max(MIN_NEED_VALUE, newHunger);
    
    console.log(`Pet hunger before: ${pet.hunger}, after: ${newHunger}`);
    
    // Update local state immediately for responsiveness
    const updatedPet = {
      ...pet,
      hunger: newHunger,
      lastNeedsUpdateTime: Date.now(), // Update timestamp to prevent immediate decay
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((newHunger + pet.happiness + pet.cleanliness + pet.affection) / 4)))
    };
    
    // Update local state immediately
    setPet(updatedPet);
    
    // Store the selected food item in localStorage
    localStorage.setItem('pendingFoodItem', JSON.stringify({
      src: foodItem.src,
      position: 50, // Center position, will be adjusted in PetPage
      hungerRestored: foodItem.hungerBoost
    }));
    
    // Navigate back to pet page to show the feeding animation
    navigate('/');
    
    // Update Firebase
    await withErrorHandling(
      () => petService.updatePetNeeds(updatedPet),
      "Failed to update pet hunger"
    );
  };

  const handleGroomPet = async (groomingItem: GroomingInventoryItem) => {
    if (!pet || typeof pet.cleanliness !== 'number') return;
    
    // Calculate new cleanliness with the same pattern as food
    let newCleanliness = Math.min(MAX_NEED_VALUE, pet.cleanliness + groomingItem.cleanlinessBoost);
    newCleanliness = Math.max(MIN_NEED_VALUE, newCleanliness);
    
    const updatedPet: Pet = {
      ...pet,
      cleanliness: newCleanliness,
      lastNeedsUpdateTime: Date.now(), // Update timestamp to prevent immediate decay
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((pet.hunger + pet.happiness + newCleanliness + pet.affection) / 4)))
    };
    
    // Update local state immediately
    setPet(updatedPet);
    
    // Store the selected grooming item in localStorage
    localStorage.setItem('pendingGroomingItem', JSON.stringify({
      src: groomingItem.src,
      position: 50, // Center position, will be adjusted in PetPage
      cleanlinessBoost: groomingItem.cleanlinessBoost
    }));
    
    // Navigate back to pet page to show the grooming animation
    navigate('/');
    
    // Update Firebase
    await withErrorHandling(
      () => petService.updatePetNeeds(updatedPet),
      "Failed to update pet cleanliness"
    );
  };

  const handlePlayWithToy = async (toyItem: ToyInventoryItem) => {
    if (!pet || typeof pet.happiness !== 'number') return;
    let newHappiness = Math.min(MAX_NEED_VALUE, pet.happiness + toyItem.happinessBoost);
    newHappiness = Math.max(MIN_NEED_VALUE, newHappiness);
    const updates: Partial<Pet> = {
      happiness: newHappiness,
      hunger: pet.hunger,
      cleanliness: pet.cleanliness,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((pet.hunger + newHappiness + pet.cleanliness + pet.affection) / 4)))
    };
    
    // Set the active toy and start animation
    setActiveToy(toyItem);
    setIsPlaying(true);
    
    // Navigate back to pet page
    navigate('/');
    
    // Stop animation after 5 seconds
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
    let currentPetData = { ...pet };
    const todayStr = getTodayDateString();

    if (currentPetData.lastAffectionGainDate !== todayStr) {
      currentPetData.affectionGainedToday = 0;
      currentPetData.lastAffectionGainDate = todayStr;
    }

    const currentGainedToday = currentPetData.affectionGainedToday || 0;
    if (currentGainedToday >= AFFECTION_DAILY_GAIN_CAP) {
      console.log("Affection daily cap reached.");
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

    let newAffection = Math.min(MAX_NEED_VALUE, (currentPetData.affection || 0) + gainableAmount);
    newAffection = Math.max(MIN_NEED_VALUE, newAffection);
    const newAffectionGainedToday = currentGainedToday + gainableAmount;

    const updates: Partial<Pet> = {
      affection: newAffection,
      affectionGainedToday: newAffectionGainedToday,
      lastAffectionGainDate: todayStr,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((currentPetData.hunger + currentPetData.happiness + currentPetData.cleanliness + newAffection) / 4)))
    };
    await withErrorHandling(
      () => petService.updatePetNeeds(updates),
      "Failed to update pet affection"
    );
  };

  useEffect(() => {
    console.log("Setting up pet subscription...");
    
    // Set a much shorter fallback timeout for faster loading
    const fallbackTimeout = setTimeout(() => {
      if (!pet || pet === defaultPetData) {
        console.log("Pet loading timeout, using default pet data");
        setPet(defaultPetData);
      }
    }, 1500); // Reduced from 3000ms to 1500ms
    
    const unsubscribe = petService.subscribeToPet((petData) => {
      console.log("Pet data received from Firebase:", petData);
      clearTimeout(fallbackTimeout); // Clear timeout since we got data
      const currentTime = Date.now();
      let needsFirebaseUpdate = false;

      if (petData) {
        console.log("Processing pet data...");
        const processedPetData: Pet = {
          ...defaultPetData,
          ...petData,
          hunger: (typeof petData.hunger === 'number' && !isNaN(petData.hunger)) ? petData.hunger : defaultPetData.hunger,
          happiness: (typeof petData.happiness === 'number' && !isNaN(petData.happiness)) ? petData.happiness : defaultPetData.happiness,
          cleanliness: (typeof petData.cleanliness === 'number' && !isNaN(petData.cleanliness)) ? petData.cleanliness : defaultPetData.cleanliness,
          affection: (typeof petData.affection === 'number' && !isNaN(petData.affection)) ? petData.affection : defaultPetData.affection,
          image: petData.image || defaultPetData.image,
        };
        const lastUpdate = processedPetData.lastNeedsUpdateTime;
        processedPetData.lastNeedsUpdateTime = (typeof lastUpdate === 'number' && lastUpdate > 0 && !isNaN(lastUpdate)) ? lastUpdate : currentTime;
        processedPetData.affectionGainedToday = processedPetData.affectionGainedToday ?? 0;
        processedPetData.lastAffectionGainDate = processedPetData.lastAffectionGainDate || getTodayDateString();
        const todayStr = getTodayDateString();
        if (processedPetData.lastAffectionGainDate !== todayStr) {
          processedPetData.affectionGainedToday = 0;
          processedPetData.lastAffectionGainDate = todayStr;
          needsFirebaseUpdate = true;
        }
        const timeElapsedMs = currentTime - processedPetData.lastNeedsUpdateTime;
        if (timeElapsedMs > 1000) {
          needsFirebaseUpdate = true;
          const hoursElapsed = timeElapsedMs / MILLISECONDS_IN_HOUR;
          const calculateDecay = (currentValue: number, decayPerDay: number): number => 
            Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, currentValue - (decayPerDay / 24) * hoursElapsed));

          processedPetData.hunger = calculateDecay(processedPetData.hunger, HUNGER_DECAY_PER_DAY);
          processedPetData.happiness = calculateDecay(processedPetData.happiness, HAPPINESS_DECAY_PER_DAY);
          processedPetData.cleanliness = calculateDecay(processedPetData.cleanliness, CLEANLINESS_DECAY_PER_DAY);
          processedPetData.affection = calculateDecay(processedPetData.affection, AFFECTION_DECAY_PER_DAY);
          processedPetData.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((processedPetData.hunger + processedPetData.happiness + processedPetData.cleanliness + processedPetData.affection) / 4)));
        }
        setPet(processedPetData);
        if (needsFirebaseUpdate) {
          withErrorHandling(
            () => petService.updatePetNeeds(processedPetData),
            "Failed to update pet needs"
          );
        }
      } else {
        setPet(defaultPetData);
        withErrorHandling(
          () => petService.updatePetNeeds(defaultPetData),
          "Failed to initialize pet data"
        );
      }
    });

    return () => {
      clearTimeout(fallbackTimeout);
      unsubscribe();
    };
  }, []);

  return (
    <AppShell
      pet={pet}
      handleFeedPet={handleFeedPet}
      handleGroomPet={handleGroomPet}
      handlePlayWithToy={handlePlayWithToy}
      handleIncreaseAffection={handleIncreaseAffection}
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
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
        </DecorationProvider>
      </ToyAnimationProvider>
        </CoinsProvider>
      </InventoryProvider>
    </ErrorBoundary>
  );
}
