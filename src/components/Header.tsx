import type { Need, Pet } from "../types";
import "./Header.css";

/* ---------- mini need bar ---------- */
export function NeedMini({
  emoji,
  value,
  desc,
  min,
  max,
}: {
  emoji: string;
  value: number;
  desc: string;
  min: number;
  max: number;
}) {
  const barVal = value - min;
  const barMax = max - min;
  return (
    <div className="needMini">
      <span className="needEmoji">{emoji}</span>
      <div className="needBarWrap">
        <progress max={barMax} value={barVal} />
        <span className="needDesc">{desc}</span>
      </div>
    </div>
  );
}

interface NeedInfo {
  need: Need;
  emoji: string;
  value: number;
  desc: string;
}

/* ---------- header ---------- */
export default function Header({
  pet,
  needInfo,
}: {
  pet: Pet | null;
  needInfo: NeedInfo[];
}) {
  return (
    <>
      <header className="header">
        {/* circle avatar */}
        <div className="avatar">
          <img
            src="/pet/neutral.png"
            alt="pet"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <span className="avatarFallback" role="img" aria-label="slime">
            🥚
          </span>
        </div>

        {/* list of compact need bars */}
        {pet && (
          <div className="needList">
            {needInfo.map((n) => (
              <NeedMini
                key={n.need}
                emoji={n.emoji}
                value={n.value}
                desc={n.desc}
                min={-30}
                max={120}
              />
            ))}
          </div>
        )}
      </header>

      {/* thin line under header */}
      <hr className="divider" />
    </>
  );
}
