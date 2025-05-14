import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import type { NeedInfo, Pet as PetType, RoomDecorItem, Need as NeedType } from "../types"; // Added NeedType
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[];
  onIncreaseAffection: (amount: number) => void;
}

export default function PetPage({ pet, needInfo, onIncreaseAffection }: PetPageProps) {
  const { roomLayers, roomLayersLoading } = useInventory(); 
  const navigate = useNavigate();

  const moodPhrase = getPetMoodPhrase(pet); 

  const currentCeiling = roomLayers?.ceiling || "/assets/ceilings/classic-ceiling.png";
  const currentWall = roomLayers?.wall || "/assets/walls/classic-wall.png";
  const currentFloor = roomLayers?.floor || "/assets/floors/classic-floor.png";
  const backDecorItems: RoomDecorItem[] = roomLayers?.backDecor || [];
  const frontDecorItems: RoomDecorItem[] = roomLayers?.frontDecor || [];
  const overlaySrc = roomLayers?.overlay || "";

  const handleNeedClick = (needType: NeedType) => {
    console.log(`Need circle clicked: ${needType}`);
    switch (needType) {
      case "affection":
        onIncreaseAffection(5); // Example: petting gives 5 affection points
        // Add visual feedback for petting here if desired (e.g., heart animation)
        break;
      case "hunger":
        navigate('/inventory', { 
          state: { 
            targetMainCategory: 'Food', 
            targetSubCategory: 'Snack' // Default to 'Snack' or the first food subCategory
          } 
        });
        break;
      case "cleanliness":
        // Placeholder: Navigate to a future "Cleaning Supplies" tab or trigger cleaning action
        console.log("Cleanliness clicked - navigate to cleaning supplies/action later.");
        // Example navigation if you had a supplies tab:
        // navigate('/inventory', { state: { targetMainCategory: 'Supplies', targetSubCategory: 'Soaps' } });
        break;
      case "happiness":
        // Placeholder: Navigate to a "Toys" tab or trigger play action
        console.log("Happiness clicked - navigate to toys/play action later.");
        // Example navigation if you had a toys tab:
        // navigate('/inventory', { state: { targetMainCategory: 'Toys', targetSubCategory: 'Interactive' } });
        break;
      case "spirit":
        // Placeholder: What action improves spirit?
        console.log("Spirit clicked - action TBD.");
        break;
      default:
        console.log("Unknown need clicked:", needType);
    }
  };

  return (
    <div className={`petPage ${!roomLayersLoading ? 'loaded' : ''}`} key={currentFloor + currentWall}> 
      {/* Room Layers */}
      {!roomLayersLoading && currentCeiling && <img src={currentCeiling} alt="Ceiling" className="layer ceiling" />}
      {!roomLayersLoading && currentWall && <img src={currentWall} alt="Wall" className="layer wall" />}
      {!roomLayersLoading && currentFloor && <img src={currentFloor} alt="Floor" className="layer floor" />}
      
      {!roomLayersLoading && backDecorItems.map((item, idx) => (
        <img
          key={`back-decor-${idx}`}
          className="decor back-decor"
          src={item.src}
          style={{ left: `${item.x}px`, top: `${item.y}px`, width: item.width ? `${item.width}px` : "auto", height: item.height ? `${item.height}px` : "auto" }}
          alt="Background decoration"
        />
      ))}

      {/* Main Pet Area (Pet Image and Mood Bubble) */}
      <div className="pet-display-area"> {/* Renamed for clarity, contains pet and mood */}
        {pet && moodPhrase && (
          <div className="pet-mood-bubble">
            <p>{moodPhrase}</p>
          </div>
        )}
        <img 
          src={pet?.image || "/pet/Neutral.png"} 
          alt="Your Pet" 
          className="petHero"
          // Removed onClick={handlePetting} - now handled by clicking the Affection need circle
        />
      </div>

      {/* Relocated Need Circles - Horizontal, below pet */}
      <div className="pet-page-needs-container">
        {pet && needInfo && needInfo.length > 0 && needInfo.map((n) => (
          <div 
            key={n.need} 
            className="need-item-interactive" // New class for styling the clickable item
            onClick={() => handleNeedClick(n.need)}
            title={`Care for ${n.need} (${n.desc})`} // Tooltip for usability
          >
            <div className="need-circle"> {/* Existing circle for visual */}
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
                <text x="18" y="20.35" className="emoji-text"> 
                  {n.emoji}
                </text>
              </svg>
            </div>
            {/* Optional: Display need name text below circle if desired */}
            {/* <span className="need-name-label">{n.need.charAt(0).toUpperCase() + n.need.slice(1)}</span> */}
          </div>
        ))}
      </div>
      
      {/* Front Decor and Overlay */}
      {!roomLayersLoading && frontDecorItems.map((item, idx) => (
        <img
          key={`front-decor-${idx}`}
          className="decor front-decor"
          src={item.src}
          style={{ left: `${item.x}px`, top: `${item.y}px`, width: item.width ? `${item.width}px` : "auto", height: item.height ? `${item.height}px` : "auto" }}
          alt="Foreground decoration"
        />
      ))}
      {!roomLayersLoading && overlaySrc && ( 
         <img src={overlaySrc} alt="Room Overlay" className="layer overlay" />
      )}

      {/* Paintbrush Icon */}
      <div 
        className="paintbrush-icon" 
        onClick={() => navigate("/inventory")}
      >
        <img src="/assets/icons/paintbrush.png" alt="Customize Room" />
      </div>
    </div>
  );
}