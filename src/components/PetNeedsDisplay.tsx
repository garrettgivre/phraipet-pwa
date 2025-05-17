import { useState } from 'react';
import type { NeedInfo, Need } from '../types';
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
          <img src={info.iconSrc} alt={info.need} />
          
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