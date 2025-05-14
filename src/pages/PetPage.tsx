import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import type { NeedInfo, Pet as PetType, RoomDecorItem } from "../types"; // Added RoomDecorItem
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
}

export default function PetPage({ pet, needInfo }: PetPageProps) {
  const { roomLayers } = useInventory();
  const navigate = useNavigate();

  const moodPhrase = getPetMoodPhrase(pet); 

  // Ensure roomLayers and its properties are defined before using them
  const currentCeiling = roomLayers?.ceiling || "/assets/ceilings/classic-ceiling.png";
  const currentWall = roomLayers?.wall || "/assets/walls/classic-wall.png";
  const currentFloor = roomLayers?.floor || "/assets/floors/classic-floor.png";
  const backDecorItems: RoomDecorItem[] = roomLayers?.backDecor || [];
  const frontDecorItems: RoomDecorItem[] = roomLayers?.frontDecor || [];
  const overlaySrc = roomLayers?.overlay || "";


  return (
    <div className={`petPage ${currentFloor ? 'loaded' : ''}`} key={currentFloor + currentWall}>
      <img src={currentCeiling} alt="Ceiling" className="layer ceiling" />
      <img src={currentWall} alt="Wall" className="layer wall" />
      <img src={currentFloor} alt="Floor" className="layer floor" />
      
      {backDecorItems.map((item, idx) => (
        <img
          key={`back-decor-${idx}`}
          className="decor back-decor"
          src={item.src}
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: item.width ? `${item.width}px` : "auto",
            height: item.height ? `${item.height}px` : "auto",
          }}
          alt="Background decoration"
        />
      ))}

      <div className="needsOverlay">
        {/* Render only if pet and needInfo are valid */}
        {pet && needInfo && needInfo.length > 0 && needInfo.map((n) => (
          <div key={n.need} className="need-item-container">
            <div className="need-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${n.value}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  transform="rotate(-90 18 18)"
                />
                <text x="18" y="20.35" className="emoji-text" transform="rotate(90 18 18)">
                  {n.emoji}
                </text>
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="pet-area">
        {pet && moodPhrase && (
          <div className="pet-mood-bubble">
            <p>{moodPhrase}</p>
          </div>
        )}
        <img 
          src={pet?.image || "/pet/Neutral.png"} // Optional chaining for pet.image
          alt="Your Pet" 
          className="petHero" 
        />
      </div>
      
      {frontDecorItems.map((item, idx) => (
        <img
          key={`front-decor-${idx}`}
          className="decor front-decor"
          src={item.src}
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: item.width ? `${item.width}px` : "auto",
            height: item.height ? `${item.height}px` : "auto",
          }}
          alt="Foreground decoration"
        />
      ))}

      {overlaySrc && ( // Only render if overlaySrc is not empty
         <img src={overlaySrc} alt="Room Overlay" className="layer overlay" />
      )}

      <div 
        className="paintbrush-icon" 
        onClick={() => navigate("/inventory")}
      >
        <img src="/assets/icons/paintbrush.png" alt="Customize Room" />
      </div>
    </div>
  );
}