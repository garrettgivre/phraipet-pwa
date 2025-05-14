import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import type { NeedInfo, Pet as PetType, RoomDecorItem } from "../types"; 
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
}

export default function PetPage({ pet, needInfo }: PetPageProps) {
  // Consume roomLayersLoading from the context
  const { roomLayers, roomLayersLoading } = useInventory(); 
  const navigate = useNavigate();

  const moodPhrase = getPetMoodPhrase(pet); 

  // Default values are now primarily handled within InventoryContext when data is fetched
  const currentCeiling = roomLayers?.ceiling;
  const currentWall = roomLayers?.wall;
  const currentFloor = roomLayers?.floor;
  const backDecorItems: RoomDecorItem[] = roomLayers?.backDecor || [];
  const frontDecorItems: RoomDecorItem[] = roomLayers?.frontDecor || [];
  const overlaySrc = roomLayers?.overlay || "";

  // The 'loaded' class is now controlled by !roomLayersLoading
  // The key can be simplified if not causing specific re-render issues, or use a stable page ID.
  return (
    <div className={`petPage ${!roomLayersLoading ? 'loaded' : ''}`} key={currentFloor}> 
      {/* Only render room layers if not loading and paths exist */}
      {!roomLayersLoading && currentCeiling && <img src={currentCeiling} alt="Ceiling" className="layer ceiling" />}
      {!roomLayersLoading && currentWall && <img src={currentWall} alt="Wall" className="layer wall" />}
      {!roomLayersLoading && currentFloor && <img src={currentFloor} alt="Floor" className="layer floor" />}
      
      {!roomLayersLoading && backDecorItems.map((item, idx) => (
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
          src={pet?.image || "/pet/Neutral.png"} 
          alt="Your Pet" 
          className="petHero" 
        />
      </div>
      
      {!roomLayersLoading && frontDecorItems.map((item, idx) => (
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

      {!roomLayersLoading && overlaySrc && ( 
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