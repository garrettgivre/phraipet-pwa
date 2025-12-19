import React, { useState, useMemo } from 'react';
import './CrystalDust.css';

interface CrystalDustProps {
  id: string;
  x: number;
  y: number;
  onCollect: (id: string) => void;
}

export default function CrystalDust({ id, x, y, onCollect }: CrystalDustProps) {
  const [isCollecting, setIsCollecting] = useState(false);

  // Randomize sparkles so they don't all look the same
  const sparkles = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      left: `${15 + Math.random() * 70}%`, // Keep somewhat central
      top: `${15 + Math.random() * 70}%`,
      delay: `${Math.random() * 2}s`
    }));
  }, []);

  // Pre-calculate shatter shards
  const shards = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      // Random angle and distance
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 40; // Distance to fly
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      
      return {
        id: i,
        style: {
          '--tx': `${tx}px`,
          '--ty': `${ty}px`,
          backgroundColor: Math.random() > 0.5 ? '#fff' : '#b088f9', // Mix of white and purple
          width: `${3 + Math.random() * 4}px`,
          height: `${3 + Math.random() * 4}px`,
        } as React.CSSProperties
      };
    });
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering other room clicks
    if (isCollecting) return;
    
    setIsCollecting(true);
    // Delay removal to allow shatter animation to play
    setTimeout(() => {
      onCollect(id);
    }, 400); 
  };

  return (
    <div 
      className={`crystal-dust ${isCollecting ? 'collecting' : ''}`}
      style={{ 
        left: `${x}%`, 
        bottom: `${y}%`,
        background: 'transparent', /* Explicitly transparent to prevent blue square */
        outline: 'none',
        border: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent' /* Removes blue highlight on mobile */
      }}
      onClick={handleClick}
    >
      <img 
        src="/pet/phraibits.png" 
        alt="Phraibit" 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain'
        }} 
      />
      
      {/* Sparkles - only show when not collecting */}
      {!isCollecting && sparkles.map(s => (
        <div 
          key={s.id} 
          className="sparkle" 
          style={{ 
            left: s.left, 
            top: s.top, 
            animationDelay: s.delay 
          }} 
        />
      ))}

      {/* Shards - only show when collecting */}
      {isCollecting && shards.map(s => (
        <div key={s.id} className="shard" style={s.style} />
      ))}
    </div>
  );
}
