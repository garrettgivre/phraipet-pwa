// src/App.tsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import type { Pet, Need, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "./types";
import { InventoryProvider } from "./contexts/InventoryContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { petService, withErrorHandling } from "./services/firebase";
import { createRoutes } from "./routes";
import Header from "./components/Header";
import NavBar from "./components/NavBar";

import "./App.css";

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
}

function AppShell({ pet, handleFeedPet, handleGroomPet, handlePlayWithToy, handleIncreaseAffection }: AppShellProps) {
  const location = useLocation();
  const isPetPage = location.pathname === "/";

  const needInfo: NeedInfo[] = pet && typeof pet.hunger === 'number' && typeof pet.cleanliness === 'number' && typeof pet.happiness === 'number' && typeof pet.affection === 'number' && typeof pet.spirit === 'number'
    ? [
        { need: "hunger", iconSrc: "/assets/icons/needs/hunger.png", value: pet.hunger, desc: descriptor("hunger", pet.hunger) },
        { need: "cleanliness", iconSrc: "/assets/icons/needs/cleanliness.png", value: pet.cleanliness, desc: descriptor("cleanliness", pet.cleanliness) },
        { need: "happiness", iconSrc: "/assets/icons/needs/happiness.png", value: pet.happiness, desc: descriptor("happiness", pet.happiness) },
        { need: "affection", iconSrc: "/assets/icons/needs/affection.png", value: pet.affection, desc: descriptor("affection", pet.affection) },
        { need: "spirit", iconSrc: "/assets/icons/needs/spirit.png", value: pet.spirit, desc: descriptor("happiness", pet.spirit) },
      ]
    : [];

  return (
    <>
      <ScrollToTop />
      {!isPetPage && ( <Header coins={100} petImage={pet?.image || "/pet/Neutral.png"} needs={needInfo} /> )}
      <main style={{
        paddingTop: isPetPage ? "0px" : "80px",
        paddingBottom: "56px",
        height: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 0
      }}>
        <ErrorBoundary>
          <Routes>
            {createRoutes({
              pet,
              handleFeedPet,
              handleGroomPet,
              handlePlayWithToy,
              handleIncreaseAffection
            }).map((route, index) => (
              <Route key={index} path={route.path} element={route.element} />
            ))}
          </Routes>
        </ErrorBoundary>
      </main>
      <NavBar />
    </>
  );
}

const defaultPetData: Pet = {
  hunger: 100, happiness: 100, cleanliness: 100, affection: 50, spirit: 0,
  image: "/pet/Neutral.png", lastNeedsUpdateTime: Date.now(),
  affectionGainedToday: 0, lastAffectionGainDate: getTodayDateString(),
};
defaultPetData.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((defaultPetData.hunger + defaultPetData.happiness + defaultPetData.cleanliness + defaultPetData.affection) / 4)));

export default function App() {
  const [pet, setPet] = useState<Pet | null>(null);

  const handleFeedPet = async (foodItem: FoodInventoryItem) => {
    if (!pet || typeof pet.hunger !== 'number') return;
    let newHunger = Math.min(MAX_NEED_VALUE, pet.hunger + foodItem.hungerRestored);
    newHunger = Math.max(MIN_NEED_VALUE, newHunger);
    const updates: Partial<Pet> = {
      hunger: newHunger,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((newHunger + pet.happiness + pet.cleanliness + pet.affection) / 4)))
    };
    await withErrorHandling(
      () => petService.updatePetNeeds(updates),
      "Failed to update pet hunger"
    );
  };

  const handleGroomPet = async (groomingItem: GroomingInventoryItem) => {
    if (!pet || typeof pet.cleanliness !== 'number') return;
    let newCleanliness = Math.min(MAX_NEED_VALUE, pet.cleanliness + groomingItem.cleanlinessBoost);
    newCleanliness = Math.max(MIN_NEED_VALUE, newCleanliness);
    const updates: Partial<Pet> = {
      cleanliness: newCleanliness,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((pet.hunger + pet.happiness + newCleanliness + pet.affection) / 4)))
    };
    await withErrorHandling(
      () => petService.updatePetNeeds(updates),
      "Failed to update pet cleanliness"
    );
  };

  const handlePlayWithToy = async (toyItem: ToyInventoryItem) => {
    if (!pet || typeof pet.happiness !== 'number') return;
    let newHappiness = Math.min(MAX_NEED_VALUE, pet.happiness + toyItem.happinessBoost);
    newHappiness = Math.max(MIN_NEED_VALUE, newHappiness);
    const updates: Partial<Pet> = {
      happiness: newHappiness,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((pet.hunger + newHappiness + pet.cleanliness + pet.affection) / 4)))
    };
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
    const unsubscribe = petService.subscribeToPet((petData) => {
      const currentTime = Date.now();
      let needsFirebaseUpdate = false;

      if (petData) {
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

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <InventoryProvider>
        <ErrorBoundary>
          <AppShell
            pet={pet}
            handleFeedPet={handleFeedPet}
            handleGroomPet={handleGroomPet}
            handlePlayWithToy={handlePlayWithToy}
            handleIncreaseAffection={handleIncreaseAffection}
          />
        </ErrorBoundary>
      </InventoryProvider>
    </BrowserRouter>
  );
}
