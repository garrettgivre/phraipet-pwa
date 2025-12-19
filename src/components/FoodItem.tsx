import { useState, useEffect, useRef, useCallback } from 'react';
import './FoodItem.css';

interface FoodItemProps {
  src: string;
  position: number;
  onEaten: () => void;
  hungerRestored: number;
  onBite?: (biteNumber: number, hungerAmount: number) => void;
}

export default function FoodItem({ src, position, onEaten, hungerRestored = 15, onBite }: FoodItemProps) {
  const [biteStage, setBiteStage] = useState(0);
  const [bitePattern] = useState(() => Math.floor(Math.random() * 3)); // 0, 1, or 2
  // Use refs to track animation state instead of relying on state updates
  const animationRef = useRef({ isAnimating: false, mounted: true });
  const propsRef = useRef({ onEaten, onBite, hungerRestored });

  // Update refs when props change
  useEffect(() => {
    propsRef.current = { onEaten, onBite, hungerRestored };
  }, [onEaten, onBite, hungerRestored]);
  
  // Add a class to the pet when a bite happens - memoized to avoid recreation
  const triggerPetChomp = useCallback((biteNumber: number) => {
    // Trigger the onBite callback if provided - use the ref version
    if (propsRef.current.onBite) {
      propsRef.current.onBite(biteNumber, Math.ceil(propsRef.current.hungerRestored / 3));
    }
  }, []);
  
  // Handle complete animation sequence with timeouts
  useEffect(() => {
    // Set animation flag
    animationRef.current = { isAnimating: true, mounted: true };
    
    // First bite after a delay
    const startAnimation = () => {
      if (!animationRef.current.mounted) return;
      
      // First bite
      setTimeout(() => {
        if (!animationRef.current.mounted) return;
        setBiteStage(1);
        triggerPetChomp(1);
        
        // Second bite
        setTimeout(() => {
          if (!animationRef.current.mounted) return;
          setBiteStage(2);
          triggerPetChomp(2);
          
          // Third bite
          setTimeout(() => {
            if (!animationRef.current.mounted) return;
            setBiteStage(3);
            triggerPetChomp(3);
            
            // Complete
            setTimeout(() => {
              if (!animationRef.current.mounted) return;
              propsRef.current.onEaten(); // Use the ref version
            }, 800);
          }, 1200);
        }, 1200);
      }, 800);
    };
    
    // Start the animation
    startAnimation();
    
    // Cleanup function
    return () => {
      animationRef.current.mounted = false;
      animationRef.current.isAnimating = false;
    };
  }, [triggerPetChomp]);  // Only depends on the memoized callback

  return (
    <div 
      className={`food-item bite-stage-${biteStage} pattern-${bitePattern}`}
      style={{ left: `${position}%` }}
    >
      <img src={src} alt="Food" />
    </div>
  );
} 