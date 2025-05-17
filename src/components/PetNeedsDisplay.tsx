import type { NeedInfo, Need as NeedType } from "../types";

interface PetNeedsDisplayProps {
  needInfo: NeedInfo[];
  onNeedClick: (needType: NeedType) => void;
}

const PetNeedsDisplay = ({ needInfo, onNeedClick }: PetNeedsDisplayProps) => {
  const iconDisplaySize = 24;

  return (
    <div className="pet-page-needs-container">
      {needInfo && needInfo.length > 0 && needInfo.map((n) => (
        <div 
          key={n.need} 
          className="need-item-interactive" 
          onClick={() => onNeedClick(n.need)} 
          title={`Care for ${n.need} (${n.desc})`}
        >
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
  );
};

export default PetNeedsDisplay; 