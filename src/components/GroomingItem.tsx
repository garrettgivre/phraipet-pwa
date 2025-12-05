import { useState, useEffect, useRef, useCallback } from 'react';
import './GroomingItem.css';

interface GroomingItemProps {
  src: string;
  position: number;
  onGroomed: () => void;
  cleanlinessBoost: number;
  onGroomingStep?: (stepNumber: number, cleanlinessAmount: number) => void;
}

export default function GroomingItem({ src, position, onGroomed, cleanlinessBoost = 15, onGroomingStep }: GroomingItemProps) {
  const [groomingStage, setGroomingStage] = useState(0);
  const [bubbles, setBubbles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const animationRef = useRef({ isAnimating: false, mounted: true });
  const propsRef = useRef({ onGroomed, onGroomingStep, cleanlinessBoost });

  // Update refs when props change
  useEffect(() => {
    propsRef.current = { onGroomed, onGroomingStep, cleanlinessBoost };
  }, [onGroomed, onGroomingStep, cleanlinessBoost]);
  
  // Add grooming animation to the pet
  const triggerPetGrooming = useCallback((stepNumber: number) => {
    const petElement = document.querySelector('.pet-layer');
    if (petElement) {
      petElement.classList.add('pet-being-groomed');
      
      setTimeout(() => {
        if (animationRef.current.mounted) {
          petElement.classList.remove('pet-being-groomed');
        }
      }, 800);
    }
    
    // Trigger the onGroomingStep callback if provided
    if (propsRef.current.onGroomingStep) {
      propsRef.current.onGroomingStep(stepNumber, Math.ceil(propsRef.current.cleanlinessBoost / 3));
    }
  }, []);
  
  // Generate random bubbles around the pet
  const generateBubbles = useCallback(() => {
    const newBubbles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 60 + 20, // 20% to 80% of container width
      y: Math.random() * 40 + 30, // 30% to 70% of container height
      delay: Math.random() * 0.5 // Random delay up to 0.5s
    }));
    setBubbles(newBubbles);
    
    // Clear bubbles after animation
    setTimeout(() => {
      if (animationRef.current.mounted) {
        setBubbles([]);
      }
    }, 2000);
  }, []);
  
  // Handle complete grooming animation sequence
  useEffect(() => {
    animationRef.current = { isAnimating: true, mounted: true };
    
    const startAnimation = () => {
      if (!animationRef.current.mounted) return;
      
      // Show speech bubble only once at the beginning
      if (propsRef.current.onGroomingStep) {
        propsRef.current.onGroomingStep(1, Math.ceil(propsRef.current.cleanlinessBoost / 3));
      }
      
      // First grooming step
      setTimeout(() => {
        if (!animationRef.current.mounted) return;
        setGroomingStage(1);
        triggerPetGrooming(1);
        generateBubbles();
        
        // Second grooming step
        setTimeout(() => {
          if (!animationRef.current.mounted) return;
          setGroomingStage(2);
          triggerPetGrooming(2);
          generateBubbles();
          
          // Third grooming step
          setTimeout(() => {
            if (!animationRef.current.mounted) return;
            setGroomingStage(3);
            triggerPetGrooming(3);
            generateBubbles();
            
            // Complete grooming
            setTimeout(() => {
              if (!animationRef.current.mounted) return;
              propsRef.current.onGroomed();
            }, 1000);
          }, 1500);
        }, 1500);
      }, 800);
    };
    
    startAnimation();
    
    return () => {
      animationRef.current.mounted = false;
      animationRef.current.isAnimating = false;
    };
  }, [triggerPetGrooming, generateBubbles]);

  return (
    <div className="grooming-container">
      {/* Grooming Item with circular motion */}
      <div 
        className={`grooming-item grooming-stage-${groomingStage}`}
        style={{ left: `${position}%` }}
      >
        <img src={src} alt="Grooming Item" />
      </div>
      
      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="grooming-bubble"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            animationDelay: `${bubble.delay}s`
          }}
        />
      ))}
    </div>
  );
} 