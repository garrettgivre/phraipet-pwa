import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import type { NeedInfo, Pet as PetType } from "../types";
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
}

export default function PetPage({ pet, needInfo }: PetPageProps) {
  const { roomLayers } = useInventory();
  const navigate = useNavigate();

  // getPetMoodPhrase now handles null pet and returns a loading/default phrase
  const moodPhrase = getPetMoodPhrase(pet); 

  return (
    // Added a key to the root div to help React re-render if roomLayers change significantly,
    // though this might not be strictly necessary for the current issue.
    <div className={`petPage ${roomLayers.floor ? 'loaded' : ''}`} key={roomLayers.floor + roomLayers.wall}>
      <img src={roomLayers.ceiling} alt="Ceiling" className="layer ceiling" />
      <img src={roomLayers.wall} alt="Wall" className="layer wall" />
      <img src={roomLayers.floor} alt="Floor" className="layer floor" />
      
      {roomLayers.backDecor.map((item, idx) => (
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
        {/* Ensure needInfo is only mapped if pet data (and thus needInfo) is valid */}
        {pet && needInfo.map((n) => (
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
        {/* Only render mood bubble if there's a pet and a non-empty mood phrase */}
        {pet && moodPhrase && (
          <div className="pet-mood-bubble">
            <p>{moodPhrase}</p>
          </div>
        )}
        <img 
          src={pet ? pet.image : "/pet/Neutral.png"}
          alt="Your Pet" 
          className="petHero" 
        />
      </div>
      
      {roomLayers.frontDecor.map((item, idx) => (
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

      {roomLayers.overlay && (
         <img src={roomLayers.overlay} alt="Room Overlay" className="layer overlay" />
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
