import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, set } from "firebase/database";
import "./App.css";

type Pet = {
  hunger: number;
  cleanliness: number;
};

const PET_ID = "sharedPet"; // one shared slime

export default function App() {
  const [pet, setPet] = useState<Pet | null>(null);

  // 1. Subscribe to DB changes once on mount
  useEffect(() => {
    const petRef = ref(db, `pets/${PET_ID}`);
    return onValue(petRef, (snap) => {
      if (snap.exists()) setPet(snap.val());
      else {
        // first‑time init
        const starter: Pet = { hunger: 100, cleanliness: 100 };
        set(petRef, starter);
      }
    });
  }, []);

  // 2. Helper to update a single field
  const updateStat = (field: keyof Pet, delta: number) => {
    if (!pet) return;
    const newVal = Math.max(0, Math.min(100, pet[field] + delta));
    set(ref(db, `pets/${PET_ID}/${field}`), newVal);
  };

  if (!pet) return <p>Loading slime…</p>;

  return (
    <main className="container">
      <h1>🐣 Phraipet</h1>

      <section className="stats">
        <Stat label="Hunger" value={pet.hunger} />
        <Stat label="Cleanliness" value={pet.cleanliness} />
      </section>

      <section className="buttons">
        <button onClick={() => updateStat("hunger", -10)}>🍕 Feed</button>
        <button onClick={() => updateStat("cleanliness", 10)}>🧼 Clean</button>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <progress max={100} value={value} />
      <span>{value}</span>
    </div>
  );
}