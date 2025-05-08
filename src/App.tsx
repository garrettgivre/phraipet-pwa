import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebase";
import type { Pet, Need } from "./types";

import Header from "./components/Header";
import NavBar from "./components/NavBar";
import { useLocation } from "react-router-dom";
import PetPage from "./pages/PetPage";

import "./App.css";

/* ---------- descriptor bands ---------- */

const PET_ID = "sharedPet";

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

/* ---------- component ---------- */

export default function App() {
  const [pet, setPet] = useState<Pet | null>(null);
  const location = useLocation();
  const hideHeader = location.pathname === "/pet";

  /* live Firebase listener */
  useEffect(() => {
    const petRef = ref(db, `pets/${PET_ID}`);
    return onValue(petRef, (snap) => {
      if (snap.exists()) setPet(snap.val() as Pet);
      else {
        const starter: Pet = {
          hunger: 100,
          happiness: 100,
          cleanliness: 100,
          affection: 100,
          spirit: 100,
          pose: "neutral",
        };
        set(petRef, starter);
      }
    });
  }, []);

  /* assemble data for header */
  const needInfo =
    pet === null
      ? []
      : ([
          { need: "hunger", emoji: "🍕", value: pet.hunger },
          { need: "cleanliness", emoji: "🧼", value: pet.cleanliness },
          { need: "happiness", emoji: "🎲", value: pet.happiness },
          { need: "affection", emoji: "💖", value: pet.affection },
          { need: "spirit", emoji: "✨", value: pet.spirit },
        ] as const).map((n) => ({
          ...n,
          desc:
            n.need === "spirit"
              ? descriptor("happiness", pet.spirit)
              : descriptor(n.need, n.value),
        }));

  return (
    <BrowserRouter>
      {/* fixed top header, except on /pet */}
      {!hideHeader && <Header pet={pet} needInfo={needInfo} />}
    
      {/* blank page body for now */}
      <div className="pageBody">
        <Routes>
          <Route path="/" element={<p style={{ textAlign: "center" }}>Welcome!</p>} />
          <Route path="/explore" element={<p style={{ textAlign: "center" }}>Explore soon…</p>} />
          <Route path="/play" element={<p style={{ textAlign: "center" }}>Play soon…</p>} />
          <Route path="/pet" element={<PetPage pet={pet} needInfo={needInfo} />} />
        </Routes>
      </div>

      {/* fixed bottom nav */}
      <NavBar />
    </BrowserRouter>
  );
}
