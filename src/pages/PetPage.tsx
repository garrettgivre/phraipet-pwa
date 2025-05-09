import type { Pet, Need } from "../types";
import "./PetPage.css";

export default function PetPage({
  pet,
  needInfo,
}: {
  pet: Pet | null;
  needInfo: { need: Need; emoji: string; value: number; desc: string }[];
}) {
  return (
    <div className="petPage">
      {/* always show neutral pose */}
      <img
        src="/pet/Neutral.png"
        alt="pet large"
        className="petHero"
      />

      <section className="needBigSection">
        {needInfo.map((n) => (
          <div key={n.need} className="needBig">
            <span className="needBigEmoji">{n.emoji}</span>
            <div className="needBigWrap">
              <progress max={150} value={n.value + 30} />
              <span className="needBigLabel">
                {n.need.charAt(0).toUpperCase() + n.need.slice(1)}
              </span>
              <span className="needBigDesc">{n.desc}</span>
              <span className="needBigNum">({n.value})</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
