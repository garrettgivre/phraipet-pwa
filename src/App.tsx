import { useEffect, useState } from "react";
import { ref, onValue, update, set } from "firebase/database";
import { db } from "./firebase";
import type { Pet, Need } from "./types";   // type‑only import
import "./App.css";

/* ─── Config ───────────────────────────────────────── */

const PET_ID = "sharedPet";               // one global slime for now
const MIN_VAL = -30;
const MAX_VAL = 120;

/* Map raw numbers → descriptor strings (your spreadsheet values) */
const bands: Record<Exclude<Need, "spirit">, { upTo: number; label: string }[]> = {
  hunger: [
    { upTo: -21, label: "Dying" },
    { upTo: -11, label: "Starving" },
    { upTo: -1,  label: "Famished" },
    { upTo: 14,  label: "Very Hungry" },
    { upTo: 29,  label: "Hungry" },
    { upTo: 44,  label: "Not Hungry" },
    { upTo: 59,  label: "Fine" },
    { upTo: 74,  label: "Satiated" },
    { upTo: 89,  label: "Full Up" },
    { upTo: 104, label: "Very Full" },
    { upTo: 119, label: "Bloated" },
    { upTo: 120, label: "Very Bloated" },
  ],
  happiness: [
    { upTo: -21, label: "Miserable" },
    { upTo: -11, label: "Sad" },
    { upTo: -1,  label: "Unhappy" },
    { upTo: 14,  label: "Dull" },
    { upTo: 29,  label: "Okay" },
    { upTo: 44,  label: "Content" },
    { upTo: 59,  label: "Happy" },
    { upTo: 74,  label: "Joyful" },
    { upTo: 89,  label: "Delighted" },
    { upTo: 104, label: "Ecstatic" },
    { upTo: 119, label: "Overjoyed" },
    { upTo: 120, label: "Blissful" },
  ],
  cleanliness: [
    { upTo: -21, label: "Filthy" },
    { upTo: -11, label: "Very Dirty" },
    { upTo: -1,  label: "Dirty" },
    { upTo: 14,  label: "Slightly Dirty" },
    { upTo: 29,  label: "Unkempt" },
    { upTo: 44,  label: "Decent" },
    { upTo: 59,  label: "Clean" },
    { upTo: 74,  label: "Very Clean" },
    { upTo: 89,  label: "Spotless" },
    { upTo: 104, label: "Gleaming" },
    { upTo: 119, label: "Pristine" },
    { upTo: 120, label: "Radiant" },
  ],
  affection: [
    { upTo: -21, label: "Neglected" },
    { upTo: -11, label: "Wary" },
    { upTo: -1,  label: "Distant" },
    { upTo: 14,  label: "Curious" },
    { upTo: 29,  label: "Friendly" },
    { upTo: 44,  label: "Affectionate" },
    { upTo: 59,  label: "Bonded" },
    { upTo: 74,  label: "Loyal" },
    { upTo: 89,  label: "Devoted" },
    { upTo: 104, label: "Inseparable" },
    { upTo: 119, label: "Loving" },
    { upTo: 120, label: "Soulmates" },
  ],
};

/* ─── Helpers ──────────────────────────────────────── */

const clamp = (n: number) => Math.max(MIN_VAL, Math.min(MAX_VAL, n));

const spiritOf = ({
  hunger,
  happiness,
  cleanliness,
  affection,
}: Omit<Pet, "spirit">) =>
  Math.round((hunger + happiness + cleanliness + affection) / 4);

/** Convert a raw value to its string descriptor */
function descriptor(need: Exclude<Need, "spirit">, value: number) {
  return bands[need].find((b) => value <= b.upTo)?.label ?? "";
}

/* ─── React component ─────────────────────────────── */

export default function App() {
  const [pet, setPet] = useState<Pet | null>(null);

  /* Subscribe to Firebase */
  useEffect(() => {
    const petRef = ref(db, `pets/${PET_ID}`);
    return onValue(petRef, (snap) => {
      if (snap.exists()) {
        setPet(snap.val() as Pet);
      } else {
        /* first‑time seed */
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

  /* Update one need (and Spirit) atomically */
  const updateNeed = (field: Exclude<Need, "spirit">, delta: number) => {
    if (!pet) return;
    const newVal = clamp(pet[field] + delta);

    const baseNeeds = {
      ...pet,
      [field]: newVal,
    } as Omit<Pet, "spirit">;

    const updates: Partial<Pet> = {
      [field]: newVal,
      spirit: spiritOf(baseNeeds),
    };

    update(ref(db, `pets/${PET_ID}`), updates);
  };

  if (!pet) return <p className="loading">Loading slime…</p>;

  /* UI list metadata */
  const UI = [
    { key: "hunger",       emoji: "🍕", plus: -10 },
    { key: "cleanliness",  emoji: "🧼", plus: +10 },
    { key: "happiness",    emoji: "🎲", plus: +10 },
    { key: "affection",    emoji: "🤗", plus: +10 },
  ] as const;

  return (
    <main className="container">
      <h1>🐣 Phraipet</h1>

      <section className="stats">
        {UI.map(({ key, emoji }) => (
          <Stat
            key={key}
            label={key}
            value={pet[key]}
            emoji={emoji}
            desc={descriptor(key, pet[key])}
          />
        ))}
        {/* reuse the happiness band names for Spirit */}
<Stat
  label="spirit"
  value={pet.spirit}
  emoji="✨"
  desc={descriptor("happiness", pet.spirit)}
/>
      </section>

      <section className="buttons">
        {UI.map(({ key, emoji, plus }) => (
          <button key={key} onClick={() => updateNeed(key, plus)}>
            {emoji} {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </section>
    </main>
  );
}

/* ─── Small sub‑components ────────────────────────── */

function Stat({
  label,
  value,
  emoji,
  desc,
}: {
  label: string;
  value: number;
  emoji: string;
  desc: string;
}) {
  /* Shift value so the <progress> bar stays non‑negative */
  const barMax = MAX_VAL - MIN_VAL;        // 150
  const barVal = value - MIN_VAL;          // e.g. -30 → 0, 120 → 150

  return (
    <div className="stat">
      <span className="stat-emoji">{emoji}</span>
      <progress max={barMax} value={barVal} />   {/* 'min' not needed */}
      <span className="stat-label">
        {label.charAt(0).toUpperCase() + label.slice(1)}:
      </span>
      <span className="stat-desc">{desc}</span>
      <span className="stat-num">({value})</span>
    </div>
  );
}
