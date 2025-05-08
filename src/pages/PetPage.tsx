// src/pages/PetPage.tsx
import type { Pet, Need } from "../types";
import "./PetPage.css";

export function NeedBar({
  emoji,
  label,
  value,
  desc,
}: {
  emoji: string;
  label: string;
  value: number;
  desc: string;
}) {
  return (
    <div className="needBig">
      <span className="needBigEmoji">{emoji}</span>
      <div className="needBigWrap">
        <progress max={150} value={value + 30} />
        <span className="needBigLabel">{label}</span>
        <span className="needBigDesc">{desc}</span>
        <span className="needBigNum">({value})</span>
      </div>
    </div>
  );
}

interface Props {
  pet: Pet | null;
  needInfo: {
    need: Need;
    emoji: string;
    value: number;
    desc: string;
  }[];
}

function PetPage({ pet, needInfo }: Props) {
  const pose = pet?.pose ?? "neutral";
  return (
    <div className="petPage">
      <img src={`/pet/${pose}.png`} alt="pet large" className="petHero" />
      <section className="needBigSection">
        {needInfo.map((n) => (
          <NeedBar
            key={n.need}
            emoji={n.emoji}
            label={n.need.charAt(0).toUpperCase() + n.need.slice(1)}
            value={n.value}
            desc={n.desc}
          />
        ))}
      </section>
    </div>
  );
}

export default PetPage;   // ← **default export is mandatory**
