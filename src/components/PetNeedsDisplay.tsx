import React, { useState } from 'react';
import type { NeedInfo } from '../types';

interface PetNeedsDisplayProps {
  needs: NeedInfo[];
}

const PetNeedsDisplay: React.FC<PetNeedsDisplayProps> = ({ needs }) => {
  const [activeBubble, setActiveBubble] = useState<string | null>(null);

  const toggleBubble = (name: string) => {
    setActiveBubble(activeBubble === name ? null : name);
  };

  return (
    <div className="pet-needs-display">
      {needs.map((info) => (
        <div
          key={info.name}
          className={`need-circle ${info.name} ${activeBubble === info.name ? 'active' : ''}`}
          onClick={() => toggleBubble(info.name)}
        >
          <div className="need-icon">
            <img
              src={info.iconSrc}
              alt={info.name}
              className="need-icon-img"
            />
          </div>
          <div className="need-value">{info.value}</div>
          {activeBubble === info.name && (
            <div className="need-bubble">
              <h3>{info.name.charAt(0).toUpperCase() + info.name.slice(1)}</h3>
              <p className="need-desc">{info.desc}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PetNeedsDisplay; 