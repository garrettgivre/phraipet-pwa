import { useState, useEffect } from 'react';
import type { Pet } from "../types";

interface PetMovementState {
  position: number;
  isWalking: boolean;
  walkingStep: number;
  isFacingRight: boolean;
}

export const usePetMovement = (pet: Pet | null): PetMovementState => {
  const [position, setPosition] = useState(50);
  const [isWalking, setIsWalking] = useState(false);
  // Use 0 or 1 for the walking step (A or B image)
  const [walkingStep, setWalkingStep] = useState(0);
  const [isFacingRight, setIsFacingRight] = useState(false);
  const [targetPosition, setTargetPosition] = useState<number | null>(null);
  
  // Keep track of when we last changed the walking step for consistent animation
  const [lastStepTime, setLastStepTime] = useState(0);

  // Constants for screen boundaries
  const MIN_POSITION = 10;
  const MAX_POSITION = 90;
  
  // Constant for step timing - one step every 300ms
  const STEP_INTERVAL = 300;

  useEffect(() => {
    if (!pet) return;

    // Decision to start walking happens every 6-12 seconds
    const moveInterval = setInterval(() => {
      // If we're not currently walking, decide on a new target
      if (!isWalking) {
      setPosition(prevPos => {
          // Determine direction based on current position and random choice
        let direction;
          if (prevPos <= MIN_POSITION + 5) {
            direction = 1; // Force move right if near left edge
          } else if (prevPos >= MAX_POSITION - 5) {
            direction = -1; // Force move left if near right edge
        } else {
          direction = Math.random() > 0.5 ? 1 : -1;
        }

          // Calculate new target position
          const movementAmount = 10 + (Math.random() * 15); 
          const newTarget = prevPos + (direction * movementAmount);
          
          // If target would be out of bounds, reflect off the boundary
          let boundedTarget = newTarget;
          if (newTarget < MIN_POSITION) {
            // Bounce off left wall - reflect the overshoot
            boundedTarget = MIN_POSITION + (MIN_POSITION - newTarget);
            direction = 1; // Force right direction after bounce
          } else if (newTarget > MAX_POSITION) {
            // Bounce off right wall - reflect the overshoot
            boundedTarget = MAX_POSITION - (newTarget - MAX_POSITION);
            direction = -1; // Force left direction after bounce
          }

          // Set the target and start walking
          setTargetPosition(boundedTarget);
        setIsWalking(true);
        setIsFacingRight(direction > 0);

          // Reset walking step for new walking animation
          setWalkingStep(0);
          setLastStepTime(Date.now());

          return prevPos; // Current position doesn't change yet
        });
      }
    }, 6000 + Math.random() * 6000); // Less frequent movements

    // Position update interval - updates position continuously
    const positionInterval = setInterval(() => {
      if (isWalking && targetPosition !== null) {
            setPosition(prevPos => {
          const distanceToTarget = targetPosition - prevPos;
          const absDistance = Math.abs(distanceToTarget);
          
          // If we're close enough to the target, stop walking
          if (absDistance < 0.5) {
            setIsWalking(false);
            setWalkingStep(0);
            setTargetPosition(null);
            return targetPosition;
          }
          
          // Otherwise, take a step in the right direction
          const stepSize = Math.min(0.8, absDistance * 0.06);
          const direction = distanceToTarget > 0 ? 1 : -1;
          
          // Update facing direction based on movement direction
          setIsFacingRight(direction > 0);
          
          return prevPos + (direction * stepSize);
        });
      }
    }, 50); // Smooth position updates

    // Separate stepping animation interval
    // This ensures consistent A-B-A-B stepping regardless of movement speed
    const steppingInterval = setInterval(() => {
      if (isWalking) {
        const now = Date.now();
        
        // Only update step if enough time has passed
        if (now - lastStepTime >= STEP_INTERVAL) {
          // Toggle between 0 and 1 (A and B images)
          setWalkingStep(prev => (prev === 0 ? 1 : 0));
          setLastStepTime(now);
        }
      }
    }, 50); // Check frequently but only update when STEP_INTERVAL has passed

    return () => {
      clearInterval(moveInterval);
      clearInterval(positionInterval);
      clearInterval(steppingInterval);
    };
  }, [pet, isWalking, targetPosition, lastStepTime]);

  return { position, isWalking, walkingStep, isFacingRight };
}; 