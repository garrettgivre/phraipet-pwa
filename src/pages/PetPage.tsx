// src/pages/PetPage.tsx
import { useNavigate } from "react-router-dom";
import { useInventory } from "../contexts/InventoryContext";
import type { NeedInfo, Pet as PetType, RoomDecorItem, Need as NeedType } from "../types";
import { getPetMoodPhrase } from "../utils/petMoodUtils";
import "./PetPage.css";

interface PetPageProps {
  pet: PetType | null;
  needInfo: NeedInfo[]; // Expects iconSrc now
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

  const iconDisplaySize = 24; // Adjust as needed for PetPage needs circles

  const handleNeedClick = (needType: NeedType) => {
    console.log(`Need circle clicked: ${needType}`);
    switch (needType) {
      case "affection":
        onIncreaseAffection(5);
        break;
      case "hunger":
        navigate('/inventory', {
          state: {
            targetMainCategory: 'Food',
            targetSubCategory: 'Snack' // Default Food sub-category
          }
        });
        break;
      case "cleanliness": // This case handles the click on the cleanliness/grooming icon
        navigate('/inventory', {
          state: {
            targetMainCategory: 'Grooming', // MODIFIED: Was 'Cleaning'
            targetSubCategory: 'BasicKit'   // Default Grooming sub-category
          }
        });
        break;
      case "happiness":
        navigate('/inventory', {
          state: {
            targetMainCategory: 'Toys',
            targetSubCategory: 'Classic' // Default Toy sub-category (using your new "Classic" type)
          }
        });
        break;
      case "spirit":
        console.log("Spirit clicked - action TBD.");
        // Potentially navigate to a different section or activity
        break;
      default:
        console.log("Unknown need clicked:", needType);
    }
  };

  return (
    <div className={`petPage ${!roomLayersLoading ? 'loaded' : ''}`} key={currentFloor + currentWall}>
      {!roomLayersLoading && currentCeiling && <img src={currentCeiling} alt="Ceiling" className="layer ceiling" />}
      {!roomLayersLoading && currentWall && <img src={currentWall} alt="Wall" className="layer wall" />}
      {!roomLayersLoading && currentFloor && <img src={currentFloor} alt="Floor" className="layer floor" />}

      {!roomLayersLoading && backDecorItems.map((item, idx) => (
        <img key={`back-decor-${idx}`} className="decor back-decor" src={item.src} style={{ left: `${item.x}px`, top: `${item.y}px`, width: item.width ? `${item.width}px` : "auto", height: item.height ? `${item.height}px` : "auto" }} alt="Background decoration" />
      ))}

      <div className="pet-display-area">
        {pet && moodPhrase && ( <div className="pet-mood-bubble"> <p>{moodPhrase}</p> </div> )}
        <img src={pet?.image || "/pet/Neutral.png"} alt="Your Pet" className="petHero" />
      </div>

      <div className="pet-page-needs-container">
        {pet && needInfo && needInfo.length > 0 && needInfo.map((n) => (
          <div key={n.need} className="need-item-interactive" onClick={() => handleNeedClick(n.need)} title={`Care for ${n.need} (${n.desc})`} >
            <div className="need-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray={`${n.value}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" transform="rotate(-90 18 18)" />
                <image
                  href={n.iconSrc}
                  x={(36 - iconDisplaySize) / 2}
                  y={(36 - iconDisplaySize) / 2}
                  height={iconDisplaySize}
                  width={iconDisplaySize}
                  className="need-icon-image"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {!roomLayersLoading && frontDecorItems.map((item, idx) => ( <img key={`front-decor-${idx}`} className="decor front-decor" src={item.src} style={{ left: `${item.x}px`, top: `${item.y}px`, width: item.width ? `${item.width}px` : "auto", height: item.height ? `${item.height}px` : "auto" }} alt="Foreground decoration" /> ))}
      {!roomLayersLoading && overlaySrc && ( <img src={overlaySrc} alt="Room Overlay" className="layer overlay" /> )}

      <div className="paintbrush-icon" onClick={() => navigate("/inventory")}> <img src="/assets/icons/paintbrush.png" alt="Customize Room" /> </div>
    </div>
  );
}
