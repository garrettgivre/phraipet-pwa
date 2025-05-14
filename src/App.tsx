// src/App.tsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ref, onValue, set, serverTimestamp, update } from "firebase/database";
import { db } from "./firebase";
import type { Pet, Need, NeedInfo, FoodInventoryItem, CleaningInventoryItem, ToyInventoryItem } from "./types";
import { InventoryProvider } from "./contexts/InventoryContext";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import PetPage from "./pages/PetPage";
import Explore from "./pages/Explore";
import Play from "./pages/Play";
import Sunnybrook from "./pages/Sunnybrook";
import SBAdoption from "./pages/Sunnybrook/SBAdoption";
import SBClinic from "./pages/Sunnybrook/SBClinic";
import SBClock from "./pages/Sunnybrook/SBClock";
import SBFountain from "./pages/Sunnybrook/SBFountain";
import SBFurniture from "./pages/Sunnybrook/SBFurniture";
import SBMart from "./pages/Sunnybrook/SBMart";
import SBStall from "./pages/Sunnybrook/SBStall";
import SBToy from "./pages/Sunnybrook/SBToy";
import InventoryPage from "./pages/InventoryPage"; // Default import

import "./App.css";

// --- Constants for Need System ---
const MAX_NEED_VALUE = 120;
const MIN_NEED_VALUE = 0;
const AFFECTION_DAILY_GAIN_CAP = 20;

const MILLISECONDS_IN_HOUR = 60 * 60 * 1000;

const HUNGER_DECAY_PER_DAY = 100;
const HAPPINESS_DECAY_PER_DAY = 50;
const CLEANLINESS_DECAY_PER_DAY = 100;
const AFFECTION_DECAY_PER_DAY = 10;

/**
 * Helper to get today's date in YYYY-MM-DD format.
 * @returns {string} The current date as "YYYY-MM-DD".
 */
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Component to automatically scroll to the top of the page on route changes.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Descriptor bands for pet needs to convert numerical values to text.
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
  handleCleanPet: (cleaningItem: CleaningInventoryItem) => void;
  handlePlayWithToy: (toyItem: ToyInventoryItem) => void;
  handleIncreaseAffection: (amount: number) => void;
}

function AppShell({ pet, handleFeedPet, handleCleanPet, handlePlayWithToy, handleIncreaseAffection }: AppShellProps) {
  const location = useLocation();
  const isPetPage = location.pathname === "/";

  const needInfo: NeedInfo[] = pet && typeof pet.hunger === 'number' && typeof pet.cleanliness === 'number' && typeof pet.happiness === 'number' && typeof pet.affection === 'number' && typeof pet.spirit === 'number'
    ? [ { need: "hunger", emoji: "🍕", value: pet.hunger, desc: descriptor("hunger", pet.hunger) }, { need: "cleanliness", emoji: "🧼", value: pet.cleanliness, desc: descriptor("cleanliness", pet.cleanliness) }, { need: "happiness", emoji: "🎲", value: pet.happiness, desc: descriptor("happiness", pet.happiness) }, { need: "affection", emoji: "🤗", value: pet.affection, desc: descriptor("affection", pet.affection) }, { need: "spirit", emoji: "✨", value: pet.spirit, desc: descriptor("happiness", pet.spirit) }, ]
    : [];
  
  return (
    <>
      <ScrollToTop />
      {!isPetPage && ( <Header coins={100} petImage={pet?.image || "/pet/Neutral.png"} needs={needInfo} /> )}
      <main style={{ paddingTop: isPetPage ? "0px" : "80px", paddingBottom: "56px", height: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Routes>
          <Route path="/" element={<PetPage pet={pet} needInfo={needInfo} onIncreaseAffection={handleIncreaseAffection} />} /> 
          <Route path="/explore" element={<Explore />} />
          <Route path="/play" element={<Play />} />
          <Route 
            path="/inventory" 
            element={<InventoryPage 
                        pet={pet} 
                        onFeedPet={handleFeedPet} 
                        onCleanPet={handleCleanPet}
                        onPlayWithToy={handlePlayWithToy}
                      />}
          />
          <Route path="/sunnybrook" element={<Sunnybrook />} />
          <Route path="/sunnybrook/Adoption" element={<SBAdoption />} />
          <Route path="/sunnybrook/SBClinic" element={<SBClinic />} />
          <Route path="/sunnybrook/SBClock" element={<SBClock />} />
          <Route path="/sunnybrook/SBFountain" element={<SBFountain />} />
          <Route path="/sunnybrook/SBFurniture" element={<SBFurniture />} />
          <Route path="/sunnybrook/SBMart" element={<SBMart />} />
          <Route path="/sunnybrook/SBStall" element={<SBStall />} />
          <Route path="/sunnybrook/SBToy" element={<SBToy />} />
        </Routes>
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

  const handleFeedPet = (foodItem: FoodInventoryItem) => {
    if (!pet || typeof pet.hunger !== 'number') return;
    let newHunger = Math.min(MAX_NEED_VALUE, pet.hunger + foodItem.hungerRestored);
    newHunger = Math.max(MIN_NEED_VALUE, newHunger);
    const petRef = ref(db, `pets/sharedPet`);
    const updates: Partial<Pet> = {
      hunger: newHunger,
      lastNeedsUpdateTime: serverTimestamp() as any,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((newHunger + pet.happiness + pet.cleanliness + pet.affection) / 4)))
    };
    update(petRef, updates).catch(err => console.error("Failed to update pet hunger:", err));
  };

  const handleCleanPet = (cleaningItem: CleaningInventoryItem) => {
    if (!pet || typeof pet.cleanliness !== 'number') return;
    let newCleanliness = Math.min(MAX_NEED_VALUE, pet.cleanliness + cleaningItem.cleanlinessBoost);
    newCleanliness = Math.max(MIN_NEED_VALUE, newCleanliness);
    const petRef = ref(db, `pets/sharedPet`);
    const updates: Partial<Pet> = {
      cleanliness: newCleanliness,
      lastNeedsUpdateTime: serverTimestamp() as any,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((pet.hunger + pet.happiness + newCleanliness + pet.affection) / 4)))
    };
    update(petRef, updates).catch(err => console.error("Failed to update pet cleanliness:", err));
  };

  const handlePlayWithToy = (toyItem: ToyInventoryItem) => {
    if (!pet || typeof pet.happiness !== 'number') return;
    let newHappiness = Math.min(MAX_NEED_VALUE, pet.happiness + toyItem.happinessBoost);
    newHappiness = Math.max(MIN_NEED_VALUE, newHappiness);
    const petRef = ref(db, `pets/sharedPet`);
    const updates: Partial<Pet> = {
      happiness: newHappiness,
      lastNeedsUpdateTime: serverTimestamp() as any,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((pet.hunger + newHappiness + pet.cleanliness + pet.affection) / 4)))
    };
    update(petRef, updates).catch(err => console.error("Failed to update pet happiness:", err));
  };

  const handleIncreaseAffection = (amount: number) => {
    if (!pet) return;
    let currentPetData = { ...pet }; // Work with a mutable copy for calculations
    const todayStr = getTodayDateString();
    if (currentPetData.lastAffectionGainDate !== todayStr) {
      currentPetData.affectionGainedToday = 0;
      currentPetData.lastAffectionGainDate = todayStr;
    }
    const currentGainedToday = currentPetData.affectionGainedToday || 0;
    if (currentGainedToday >= AFFECTION_DAILY_GAIN_CAP) {
      console.log("Affection daily cap reached.");
      update(ref(db, `pets/sharedPet`), { lastNeedsUpdateTime: serverTimestamp() as any });
      return;
    }
    const gainableAmount = Math.min(amount, AFFECTION_DAILY_GAIN_CAP - currentGainedToday);
    if (gainableAmount <= 0) {
      update(ref(db, `pets/sharedPet`), { lastNeedsUpdateTime: serverTimestamp() as any });
      return;
    }
    let newAffection = Math.min(MAX_NEED_VALUE, (currentPetData.affection || 0) + gainableAmount);
    newAffection = Math.max(MIN_NEED_VALUE, newAffection);
    const newAffectionGainedToday = currentGainedToday + gainableAmount;
    const petRef = ref(db, `pets/sharedPet`);
    const updates: Partial<Pet> = {
      affection: newAffection,
      affectionGainedToday: newAffectionGainedToday,
      lastAffectionGainDate: todayStr,
      lastNeedsUpdateTime: serverTimestamp() as any,
      spirit: Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((currentPetData.hunger + currentPetData.happiness + currentPetData.cleanliness + newAffection) / 4)))
    };
    update(petRef, updates).catch(err => console.error("Failed to update pet affection:", err));
  };

  useEffect(() => {
    const petRef = ref(db, `pets/sharedPet`);
    const unsubscribe = onValue(petRef, (snapshot) => {
      const currentTime = Date.now();
      let petDataFromFirebase: Pet;
      let needsFirebaseUpdate = false;
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        petDataFromFirebase = { ...defaultPetData, ...rawData,
          hunger: (typeof rawData.hunger === 'number' && !isNaN(rawData.hunger)) ? rawData.hunger : defaultPetData.hunger,
          happiness: (typeof rawData.happiness === 'number' && !isNaN(rawData.happiness)) ? rawData.happiness : defaultPetData.happiness,
          cleanliness: (typeof rawData.cleanliness === 'number' && !isNaN(rawData.cleanliness)) ? rawData.cleanliness : defaultPetData.cleanliness,
          affection: (typeof rawData.affection === 'number' && !isNaN(rawData.affection)) ? rawData.affection : defaultPetData.affection,
          image: rawData.image || defaultPetData.image,
        };
        const lastUpdate = petDataFromFirebase.lastNeedsUpdateTime;
        petDataFromFirebase.lastNeedsUpdateTime = (typeof lastUpdate === 'number' && lastUpdate > 0 && !isNaN(lastUpdate)) ? lastUpdate : currentTime; 
        petDataFromFirebase.affectionGainedToday = petDataFromFirebase.affectionGainedToday ?? 0;
        petDataFromFirebase.lastAffectionGainDate = petDataFromFirebase.lastAffectionGainDate || getTodayDateString();
        const todayStr = getTodayDateString();
        if (petDataFromFirebase.lastAffectionGainDate !== todayStr) {
          petDataFromFirebase.affectionGainedToday = 0;
          petDataFromFirebase.lastAffectionGainDate = todayStr;
          needsFirebaseUpdate = true; 
        }
        const timeElapsedMs = currentTime - petDataFromFirebase.lastNeedsUpdateTime;
        if (timeElapsedMs > 1000) { 
          needsFirebaseUpdate = true; 
          const hoursElapsed = timeElapsedMs / MILLISECONDS_IN_HOUR;
          const calculateDecay = (currentValue: number, decayPerDay: number): number => Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, currentValue - (decayPerDay / 24) * hoursElapsed));
          petDataFromFirebase.hunger = calculateDecay(petDataFromFirebase.hunger, HUNGER_DECAY_PER_DAY);
          petDataFromFirebase.happiness = calculateDecay(petDataFromFirebase.happiness, HAPPINESS_DECAY_PER_DAY);
          petDataFromFirebase.cleanliness = calculateDecay(petDataFromFirebase.cleanliness, CLEANLINESS_DECAY_PER_DAY);
          petDataFromFirebase.affection = calculateDecay(petDataFromFirebase.affection, AFFECTION_DECAY_PER_DAY);
        }
        petDataFromFirebase.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((petDataFromFirebase.hunger + petDataFromFirebase.happiness + petDataFromFirebase.cleanliness + petDataFromFirebase.affection) / 4)));
        setPet({...petDataFromFirebase}); 
        if (needsFirebaseUpdate) {
          const updateForFirebase = { ...petDataFromFirebase, lastNeedsUpdateTime: serverTimestamp() };
          set(petRef, updateForFirebase).catch(err => console.error("Error updating pet needs in Firebase:", err));
        }
      } else {
        console.log("No pet data in Firebase, creating starter pet.");
        const initialPetDataForFirebase = { ...defaultPetData, lastNeedsUpdateTime: serverTimestamp() };
        set(petRef, initialPetDataForFirebase).then(() => { setPet({...defaultPetData, lastNeedsUpdateTime: Date.now() }); })
          .catch((error) => console.error("Failed to set starter pet in Firebase:", error));
      }
    }, (error) => {
      console.error("Firebase onValue error:", error);
      const fallbackPet = { ...defaultPetData, lastNeedsUpdateTime: Date.now(), affectionGainedToday: 0, lastAffectionGainDate: getTodayDateString() };
      fallbackPet.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round((fallbackPet.hunger + fallbackPet.happiness + fallbackPet.cleanliness + fallbackPet.affection) / 4)));
      setPet(fallbackPet);
    });
    return () => unsubscribe();
  }, []);

  return (
    <InventoryProvider>
      <BrowserRouter>
        <AppShell 
          pet={pet} 
          handleFeedPet={handleFeedPet}
          handleCleanPet={handleCleanPet}
          handlePlayWithToy={handlePlayWithToy}
          handleIncreaseAffection={handleIncreaseAffection} 
        />
      </BrowserRouter>
    </InventoryProvider>
  );
}
