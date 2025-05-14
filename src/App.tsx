import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ref, onValue, set, serverTimestamp } from "firebase/database"; // Added serverTimestamp
import { db } from "./firebase";
import type { Pet, Need, NeedInfo, FoodInventoryItem } from "./types";
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
import InventoryPage from "./pages/InventoryPage";

import "./App.css";

// --- Constants for Need System ---
const MAX_NEED_VALUE = 120;
const MIN_NEED_VALUE = 0;
// const AFFECTION_DAILY_GAIN_CAP = 20; // This will be used in functions that grant affection

const MILLISECONDS_IN_HOUR = 60 * 60 * 1000;
// const MILLISECONDS_IN_DAY = 24 * MILLISECONDS_IN_HOUR; // Not directly used in decay calc, but good for reference

const HUNGER_DECAY_PER_DAY = 100;
const HAPPINESS_DECAY_PER_DAY = 50;
const CLEANLINESS_DECAY_PER_DAY = 100;
const AFFECTION_DECAY_PER_DAY = 10;

/**
 * Helper to get today's date in YYYY-MM-DD format.
 * This is used for resetting daily caps (like affection gained).
 * @returns {string} The current date as "YYYY-MM-DD".
 */
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
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
  hunger: [
    { upTo: -21, label: "Dying" }, { upTo: -11, label: "Starving" }, { upTo: -1, label: "Famished" },
    { upTo: 14, label: "Very Hungry" }, { upTo: 29, label: "Hungry" }, { upTo: 44, label: "Not Hungry" },
    { upTo: 59, label: "Fine" }, { upTo: 74, label: "Satiated" }, { upTo: 89, label: "Full Up" },
    { upTo: 104, label: "Very Full" }, { upTo: 119, label: "Bloated" }, { upTo: 120, label: "Very Bloated" },
  ],
  happiness: [
    { upTo: -21, label: "Miserable" }, { upTo: -11, label: "Sad" }, { upTo: -1, label: "Unhappy" },
    { upTo: 14, label: "Dull" }, { upTo: 29, label: "Okay" }, { upTo: 44, label: "Content" },
    { upTo: 59, label: "Happy" }, { upTo: 74, label: "Joyful" }, { upTo: 89, label: "Delighted" },
    { upTo: 104, label: "Ecstatic" }, { upTo: 119, label: "Overjoyed" }, { upTo: 120, label: "Blissful" },
  ],
  cleanliness: [
    { upTo: -21, label: "Filthy" }, { upTo: -11, label: "Very Dirty" }, { upTo: -1, label: "Dirty" },
    { upTo: 14, label: "Slightly Dirty" }, { upTo: 29, label: "Unkempt" }, { upTo: 44, label: "Decent" },
    { upTo: 59, label: "Clean" }, { upTo: 74, label: "Very Clean" }, { upTo: 89, label: "Spotless" },
    { upTo: 104, label: "Gleaming" }, { upTo: 119, label: "Pristine" }, { upTo: 120, label: "Radiant" },
  ],
  affection: [
    { upTo: -21, label: "Neglected" }, { upTo: -11, label: "Wary" }, { upTo: -1, label: "Distant" },
    { upTo: 14, label: "Curious" }, { upTo: 29, label: "Friendly" }, { upTo: 44, label: "Affectionate" },
    { upTo: 59, label: "Bonded" }, { upTo: 74, label: "Loyal" }, { upTo: 89, label: "Devoted" },
    { upTo: 104, label: "Inseparable" }, { upTo: 119, label: "Loving" }, { upTo: 120, label: "Soulmates" },
  ],
};

/**
 * Gets a descriptive string for a given need and its value.
 * Handles cases where value might be undefined or not a number.
 * @param need - The type of need.
 * @param value - The current value of the need.
 * @returns A descriptive string or a default "Unknown" string.
 */
const descriptor = (need: Exclude<Need, "spirit">, value: number | undefined): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return "Unknown"; 
  }
  const needBand = bands[need];
  if (!needBand) {
    console.warn(`Descriptor bands not found for need: ${need}`);
    return "Undefined Need Type";
  }
  return needBand.find((b) => value <= b.upTo)?.label ?? "Undefined State";
}

interface AppShellProps {
  pet: Pet | null;
  setPet: React.Dispatch<React.SetStateAction<Pet | null>>; // setPet is used by App component, not directly by AppShell for pet updates
}

/**
 * AppShell component: Renders the main layout including Header, NavBar, and page content via Routes.
 * It receives the current pet data to pass to child components.
 */
function AppShell({ pet }: AppShellProps) { // Removed setPet from props as it's not directly used here for updates
  const location = useLocation();
  const isPetPage = location.pathname === "/";

  // Construct needInfo only if pet is not null and its properties are valid numbers
  const needInfo: NeedInfo[] = pet &&
    typeof pet.hunger === 'number' &&
    typeof pet.cleanliness === 'number' &&
    typeof pet.happiness === 'number' &&
    typeof pet.affection === 'number' &&
    typeof pet.spirit === 'number'
    ? [
        { need: "hunger", emoji: "🍕", value: pet.hunger, desc: descriptor("hunger", pet.hunger) },
        { need: "cleanliness", emoji: "🧼", value: pet.cleanliness, desc: descriptor("cleanliness", pet.cleanliness) },
        { need: "happiness", emoji: "🎲", value: pet.happiness, desc: descriptor("happiness", pet.happiness) },
        { need: "affection", emoji: "🤗", value: pet.affection, desc: descriptor("affection", pet.affection) },
        { need: "spirit", emoji: "✨", value: pet.spirit, desc: descriptor("happiness", pet.spirit) }, // Spirit uses happiness descriptors for now
      ]
    : []; // Default to empty array if pet or its properties are not ready
  
  // This function will be passed down to InventoryPage.
  // It's defined in App component and passed through AppShell.
  // For clarity, we can also define it in App and pass it directly to InventoryPage via props if AppShell doesn't need it.
  // However, since AppShell is already passing `pet`, it's reasonable to pass `handleFeedPet` from here too.
  // The actual state update (setPet) will happen in the App component's Firebase listener.
  const handleFeedPet = (foodItem: FoodInventoryItem) => {
    if (!pet || typeof pet.hunger !== 'number') {
      console.warn("Cannot feed: Pet data or hunger value is invalid.");
      return;
    }
    
    let newHunger = Math.min(MAX_NEED_VALUE, pet.hunger + foodItem.hungerRestored);
    newHunger = Math.max(MIN_NEED_VALUE, newHunger);

    const updatedPetData: Partial<Pet> = { 
        hunger: newHunger,
        lastNeedsUpdateTime: serverTimestamp() as any // Mark interaction time
    };
    
    const petRef = ref(db, `pets/sharedPet`);
    // We merge with existing pet data to ensure we only update specific fields
    const currentPetData = { ...pet, ...updatedPetData }; 
    set(petRef, currentPetData) 
      .then(() => {
        console.log(`Pet fed with ${foodItem.name}. Hunger is now approximately ${newHunger}. Firebase will confirm.`);
      })
      .catch(err => console.error("Failed to update pet hunger in Firebase:", err));
  };

  return (
    <>
      <ScrollToTop />
      {!isPetPage && (
        <Header 
          coins={100} 
          petImage={pet?.image || "/pet/Neutral.png"}
          needs={needInfo} 
        />
      )}
      <main style={{
        paddingTop: isPetPage ? "0px" : "80px", 
        paddingBottom: "56px",
        height: "100vh", 
        boxSizing: "border-box", 
        display: "flex",         
        flexDirection: "column",
        overflow: "hidden" 
      }}>
        <Routes>
          <Route path="/" element={<PetPage pet={pet} needInfo={needInfo} />} /> 
          <Route path="/explore" element={<Explore />} />
          <Route path="/play" element={<Play />} />
          <Route 
            path="/inventory" 
            element={<InventoryPage pet={pet} onFeedPet={handleFeedPet} />}
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

// Default starter pet data, now including new fields
const defaultPetData: Pet = {
  hunger: 100, 
  happiness: 100,
  cleanliness: 100,
  affection: 50, 
  spirit: 0, // Will be calculated based on others
  image: "/pet/Neutral.png",
  lastNeedsUpdateTime: Date.now(), 
  affectionGainedToday: 0,
  lastAffectionGainDate: getTodayDateString(),
};
// Calculate initial spirit for defaultPetData
defaultPetData.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE,
  Math.round((defaultPetData.hunger + defaultPetData.happiness + defaultPetData.cleanliness + defaultPetData.affection) / 4)
));


/**
 * Main App component: Manages pet state, Firebase connection, and routing.
 */
export default function App() {
  const [pet, setPet] = useState<Pet | null>(null); // Initialize as null, will be populated from Firebase or default

  useEffect(() => {
    const petRef = ref(db, `pets/sharedPet`);
    const unsubscribe = onValue(petRef, (snapshot) => {
      const currentTime = Date.now();
      let petDataFromFirebase: Pet; // Will hold the processed pet data
      let needsFirebaseUpdate = false; // Flag to indicate if Firebase needs to be updated

      if (snapshot.exists()) {
        const rawData = snapshot.val();
        
        // Initialize with defaults, then override with Firebase data if valid
        petDataFromFirebase = { 
          ...defaultPetData, // Start with a complete default structure
          ...rawData, // Override with whatever Firebase has
          // Ensure critical numeric fields are numbers, falling back to default if not
          hunger: (typeof rawData.hunger === 'number' && !isNaN(rawData.hunger)) ? rawData.hunger : defaultPetData.hunger,
          happiness: (typeof rawData.happiness === 'number' && !isNaN(rawData.happiness)) ? rawData.happiness : defaultPetData.happiness,
          cleanliness: (typeof rawData.cleanliness === 'number' && !isNaN(rawData.cleanliness)) ? rawData.cleanliness : defaultPetData.cleanliness,
          affection: (typeof rawData.affection === 'number' && !isNaN(rawData.affection)) ? rawData.affection : defaultPetData.affection,
          // spirit will be recalculated
          image: rawData.image || defaultPetData.image,
        };
        
        // Ensure lastNeedsUpdateTime is a valid number, otherwise use current time (or default if it's the very first load)
        const lastUpdate = petDataFromFirebase.lastNeedsUpdateTime;
        petDataFromFirebase.lastNeedsUpdateTime = (typeof lastUpdate === 'number' && lastUpdate > 0 && !isNaN(lastUpdate)) 
            ? lastUpdate 
            : currentTime; // If invalid, assume this is the first update cycle

        // Initialize affection cap fields if missing
        petDataFromFirebase.affectionGainedToday = petDataFromFirebase.affectionGainedToday ?? 0;
        petDataFromFirebase.lastAffectionGainDate = petDataFromFirebase.lastAffectionGainDate || getTodayDateString();

        // --- Affection Cap Daily Reset ---
        const todayStr = getTodayDateString();
        if (petDataFromFirebase.lastAffectionGainDate !== todayStr) {
          petDataFromFirebase.affectionGainedToday = 0;
          petDataFromFirebase.lastAffectionGainDate = todayStr;
          needsFirebaseUpdate = true; 
        }

        // --- Calculate Time Elapsed and Decay ---
        // Only calculate decay if lastNeedsUpdateTime is reasonably in the past
        const timeElapsedMs = currentTime - petDataFromFirebase.lastNeedsUpdateTime;

        if (timeElapsedMs > 1000) { // Only apply decay if more than a second has passed (to avoid tiny updates)
          needsFirebaseUpdate = true; 
          const hoursElapsed = timeElapsedMs / MILLISECONDS_IN_HOUR;

          const calculateDecay = (currentValue: number, decayPerDay: number): number => {
            const decayAmount = (decayPerDay / 24) * hoursElapsed;
            return Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, currentValue - decayAmount));
          };

          petDataFromFirebase.hunger = calculateDecay(petDataFromFirebase.hunger, HUNGER_DECAY_PER_DAY);
          petDataFromFirebase.happiness = calculateDecay(petDataFromFirebase.happiness, HAPPINESS_DECAY_PER_DAY);
          petDataFromFirebase.cleanliness = calculateDecay(petDataFromFirebase.cleanliness, CLEANLINESS_DECAY_PER_DAY);
          petDataFromFirebase.affection = calculateDecay(petDataFromFirebase.affection, AFFECTION_DECAY_PER_DAY);
        }
        
        // --- Recalculate Spirit ---
        petDataFromFirebase.spirit = Math.round(
          (petDataFromFirebase.hunger +
           petDataFromFirebase.happiness +
           petDataFromFirebase.cleanliness +
           petDataFromFirebase.affection) / 4
        );
        petDataFromFirebase.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, petDataFromFirebase.spirit));

        // Update local state immediately for responsiveness
        setPet({...petDataFromFirebase}); 

        if (needsFirebaseUpdate) {
          // Prepare data for Firebase, ensuring lastNeedsUpdateTime is a server timestamp
          const updateForFirebase = { ...petDataFromFirebase, lastNeedsUpdateTime: serverTimestamp() };
          set(petRef, updateForFirebase)
            .catch(err => console.error("Error updating pet needs in Firebase:", err));
        }

      } else {
        // Pet data doesn't exist in Firebase, create it with default values
        console.log("No pet data in Firebase, creating starter pet.");
        const initialPetDataForFirebase = {
            ...defaultPetData,
            lastNeedsUpdateTime: serverTimestamp() // Use server timestamp for initial creation
        };
        set(petRef, initialPetDataForFirebase)
          .then(() => {
            // For immediate local state after creation, use current client time for lastNeedsUpdateTime
            setPet({...defaultPetData, lastNeedsUpdateTime: Date.now() });
          })
          .catch((error) => {
            console.error("Failed to set starter pet in Firebase:", error);
          });
      }
    }, (error) => {
      console.error("Firebase onValue error:", error);
      // Fallback to local default if Firebase read fails, ensuring new fields are present
      const fallbackPet = {
        ...defaultPetData,
        lastNeedsUpdateTime: Date.now(), // Use client time for fallback
        affectionGainedToday: 0,
        lastAffectionGainDate: getTodayDateString(),
      };
      // Recalculate spirit for the fallback pet
      fallbackPet.spirit = Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE,
        Math.round((fallbackPet.hunger + fallbackPet.happiness + fallbackPet.cleanliness + fallbackPet.affection) / 4)
      ));
      setPet(fallbackPet);
    });

    return () => unsubscribe(); // Cleanup Firebase listener on component unmount
  }, []); // Empty dependency array ensures this effect runs only once on mount

  return (
    <InventoryProvider>
      <BrowserRouter>
        {/* Pass setPet to AppShell if AppShell needs to modify pet state directly,
            otherwise, modifications should happen in App and flow down.
            For handleFeedPet, it's passed down, but the actual setPet is via onValue.
        */}
        <AppShell pet={pet} setPet={setPet} />
      </BrowserRouter>
    </InventoryProvider>
  );
}
