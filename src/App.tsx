import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebase";
import type { Pet, Need, NeedInfo } from "./types";

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

import "./App.css";

/* ─── descriptor bands ───────────────────────────────────────────────── */

const bands: Record<Exclude<Need, "spirit">, { upTo: number; label: string }[]> = {
  hunger: [
    { upTo: -21, label: "Dying" },
    { upTo: -11, label: "Starving" },
    { upTo: -1, label: "Famished" },
    { upTo: 14, label: "Very Hungry" },
    { upTo: 29, label: "Hungry" },
    { upTo: 44, label: "Not Hungry" },
    { upTo: 59, label: "Fine" },
    { upTo: 74, label: "Satiated" },
    { upTo: 89, label: "Full Up" },
    { upTo: 104, label: "Very Full" },
    { upTo: 119, label: "Bloated" },
    { upTo: 120, label: "Very Bloated" },
  ],
  happiness: [
    { upTo: -21, label: "Miserable" },
    { upTo: -11, label: "Sad" },
    { upTo: -1, label: "Unhappy" },
    { upTo: 14, label: "Dull" },
    { upTo: 29, label: "Okay" },
    { upTo: 44, label: "Content" },
    { upTo: 59, label: "Happy" },
    { upTo: 74, label: "Joyful" },
    { upTo: 89, label: "Delighted" },
    { upTo: 104, label: "Ecstatic" },
    { upTo: 119, label: "Overjoyed" },
    { upTo: 120, label: "Blissful" },
  ],
  cleanliness: [
    { upTo: -21, label: "Filthy" },
    { upTo: -11, label: "Very Dirty" },
    { upTo: -1, label: "Dirty" },
    { upTo: 14, label: "Slightly Dirty" },
    { upTo: 29, label: "Unkempt" },
    { upTo: 44, label: "Decent" },
    { upTo: 59, label: "Clean" },
    { upTo: 74, label: "Very Clean" },
    { upTo: 89, label: "Spotless" },
    { upTo: 104, label: "Gleaming" },
    { upTo: 119, label: "Pristine" },
    { upTo: 120, label: "Radiant" },
  ],
  affection: [
    { upTo: -21, label: "Neglected" },
    { upTo: -11, label: "Wary" },
    { upTo: -1, label: "Distant" },
    { upTo: 14, label: "Curious" },
    { upTo: 29, label: "Friendly" },
    { upTo: 44, label: "Affectionate" },
    { upTo: 59, label: "Bonded" },
    { upTo: 74, label: "Loyal" },
    { upTo: 89, label: "Devoted" },
    { upTo: 104, label: "Inseparable" },
    { upTo: 119, label: "Loving" },
    { upTo: 120, label: "Soulmates" },
  ],
};

const descriptor = (need: Exclude<Need, "spirit">, value: number) =>
  bands[need].find((b) => value <= b.upTo)?.label ?? "";

/* ─── AppShell ──────────────────────────────────────────────────────── */

function AppShell({ pet }: { pet: Pet | null }) {
  const location = useLocation();
  const hideHeader = location.pathname === "/";

  const needInfo: NeedInfo[] = pet === null ? [] : [
    { need: "hunger", emoji: "🍕", value: pet.hunger, desc: descriptor("hunger", pet.hunger) },
    { need: "cleanliness", emoji: "🧼", value: pet.cleanliness, desc: descriptor("cleanliness", pet.cleanliness) },
    { need: "happiness", emoji: "🎲", value: pet.happiness, desc: descriptor("happiness", pet.happiness) },
    { need: "affection", emoji: "🤗", value: pet.affection, desc: descriptor("affection", pet.affection) },
    { need: "spirit", emoji: "✨", value: pet.spirit, desc: descriptor("happiness", pet.spirit) }, // Assuming spirit uses happiness descriptor
  ];

  return (
    <>  
      {!hideHeader && <Header pet={pet} />}

      <Routes>
        <Route path="/sunnybrook" element={<Sunnybrook />} />
        <Route path="/sunnybrook/Adoption" element={<SBAdoption />} />
        <Route path="/sunnybrook/SBClinic" element={<SBClinic />} />
        <Route path="/sunnybrook/SBClock" element={<SBClock />} />
        <Route path="/sunnybrook/SBFountain" element={<SBFountain />} />
        <Route path="/sunnybrook/SBFurniture" element={<SBFurniture />} />
        <Route path="/sunnybrook/SBMart" element={<SBMart />} />
        <Route path="/sunnybrook/SBStall" element={<SBStall />} />
        <Route path="/sunnybrook/SBToy" element={<SBToy />} />
        <Route path="/inventory" element={<InventoryPage />} />

        <Route path="/" element={<PetPage needInfo={needInfo} />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/play" element={<Play />} />
      </Routes>

      <NavBar />
    </>
  );
}

/* ─── Main App ──────────────────────────────────────────────────────── */

export default function App() {
  const [pet, setPet] = useState<Pet | null>(null);

  useEffect(() => {
    const petRef = ref(db, `pets/sharedPet`);
    return onValue(petRef, (snap) => {
      if (snap.exists()) setPet(snap.val() as Pet);
      else {
        const starter: Pet = {
          hunger: 100,
          happiness: 100,
          cleanliness: 100,
          affection: 100,
          spirit: 100,
        };
        set(petRef, starter);
      }
    });
  }, []);

  return (
    <BrowserRouter>
      <AppShell pet={pet} />
    </BrowserRouter>
  );
}
