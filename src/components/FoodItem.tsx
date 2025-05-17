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
  // Use refs to track animation state instead of relying on state updates
  const animationRef = useRef({ isAnimating: false, mounted: true });
  const propsRef = useRef({ onEaten, onBite, hungerRestored });

  // Update refs when props change
  useEffect(() => {
    propsRef.current = { onEaten, onBite, hungerRestored };
  }, [onEaten, onBite, hungerRestored]);
  
  // Add a class to the pet when a bite happens - memoized to avoid recreation
  const triggerPetChomp = useCallback((biteNumber: number) => {
    // Find the pet element
    const petElement = document.querySelector('.pet-layer');
    if (petElement) {
      // Add the chomping class
      petElement.classList.add('pet-eating');
      
      // Remove the class after the animation completes
      setTimeout(() => {
        if (animationRef.current.mounted) {
          petElement.classList.remove('pet-eating');
        }
      }, 500);
    }
    
    // Trigger the onBite callback if provided - use the ref version
    if (propsRef.current.onBite) {
      propsRef.current.onBite(biteNumber, Math.ceil(propsRef.current.hungerRestored / 3));
    }
  }, []);
  
  // Handle complete animation sequence with timeouts
  useEffect(() => {
    // Set animation flag
    animationRef.current = { isAnimating: true, mounted: true };
    
    console.log("Starting food animation sequence");
    
    // First bite after a delay
    const startAnimation = () => {
      if (!animationRef.current.mounted) return;
      
      // First bite
      setTimeout(() => {
        if (!animationRef.current.mounted) return;
        console.log("Bite 1");
        setBiteStage(1);
        triggerPetChomp(1);
        
        // Second bite
        setTimeout(() => {
          if (!animationRef.current.mounted) return;
          console.log("Bite 2");
          setBiteStage(2);
          triggerPetChomp(2);
          
          // Third bite
          setTimeout(() => {
            if (!animationRef.current.mounted) return;
            console.log("Bite 3");
            setBiteStage(3);
            triggerPetChomp(3);
            
            // Complete
            setTimeout(() => {
              if (!animationRef.current.mounted) return;
              console.log("Eating complete");
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
      console.log("Cleaning up food animation");
      animationRef.current.mounted = false;
      animationRef.current.isAnimating = false;
    };
  }, [triggerPetChomp]);  // Only depends on the memoized callback

  return (
    <div 
      className={`food-item bite-stage-${biteStage}`}
      style={{ left: `${position}%` }}
    >
      <img src={src} alt="Food" />
    </div>
  );
} 