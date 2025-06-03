import { useState } from 'react';
import type { NeedInfo, Need } from '../types';
import { getNeedBarColor } from '../utils/colorUtils';
import './PetNeedsDisplay.css';

interface PetNeedsDisplayProps {
  needInfo: NeedInfo[];
  onNeedClick: (need: Need) => void;
}

export default function PetNeedsDisplay({ needInfo, onNeedClick }: PetNeedsDisplayProps) {
  const [activeBubble, setActiveBubble] = useState<Need | null>(null);

  const toggleBubble = (need: Need) => {
    setActiveBubble(activeBubble === need ? null : need);
    onNeedClick(need);
  };

  return (
    <div className="pet-needs-display">
      {needInfo.map((info) => (
        <div 
          key={info.need} 
          className={`need-circle ${info.need} ${activeBubble === info.need ? 'active' : ''}`}
          onClick={() => toggleBubble(info.need)}
        >
          <svg viewBox="0 0 36 36" className="circular-chart" preserveAspectRatio="xMidYMid meet">
            <path
              className="circle-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="circle"
              strokeDasharray={`${info.value}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              style={{ stroke: getNeedBarColor(info.value) }}
              transform="rotate(-90 18 18)"
            />
            <image
              href={info.iconSrc}
              x="6"
              y="6"
              height="24"
              width="24"
              className="need-icon-image"
            />
          </svg>
          
          {activeBubble === info.need && (
            <div className="need-info-bubble">
              <h3>{info.need.charAt(0).toUpperCase() + info.need.slice(1)}</h3>
              <p className="need-desc">{info.desc}</p>
              <p className="need-value">{info.value}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 