import { useState, useEffect, useRef } from 'react';
import type { Pet } from "../types";

interface PetMovementState {
  position: number;
  isWalking: boolean;
  walkingStep: number;
  isFacingRight: boolean;
  isTurning: boolean; // New state for turning animation
  isSquashing: boolean;
}

export const usePetMovement = (pet: Pet | null, isPlaying: boolean = false): PetMovementState => {
  const [position, setPosition] = useState(50);
  const [isWalking, setIsWalking] = useState(false);
  const [isTurning, setIsTurning] = useState(false); // New turning state
  const [isSquashing, setIsSquashing] = useState(false);
  // Use 0 or 1 for the walking step (A or B image)
  const [walkingStep, setWalkingStep] = useState(0);
  const [isFacingRight, setIsFacingRight] = useState(false);
  const [targetPosition, setTargetPosition] = useState<number | null>(null);
  
  // Keep track of when we last changed the walking step for consistent animation
  const lastStepTimeRef = useRef(0);

  // Constants for screen boundaries
  const MIN_POSITION = 10;
  const MAX_POSITION = 90;
  
  // Constant for step timing - one step every 300ms
  const STEP_INTERVAL = 300;
  const TURN_DURATION = 300; // Duration of turn animation

  useEffect(() => {
    if (!pet) return;

    // If playing, we modify behavior slightly but don't completely stop movement
    if (isPlaying) {
      // Allow movement but perhaps with different frequency or behavior if desired
      // For now, we'll just let the standard random movement logic proceed
    }

    // Decision to start walking happens every 6-12 seconds
    const moveInterval = setInterval(() => {
      // If we're not currently walking or turning, decide on a new target
      if (!isWalking && !isTurning && !isSquashing) {
        // Randomly decide to squash (idle animation) instead of moving
        // 30% chance to squash
        if (Math.random() < 0.3) {
          setIsSquashing(true);
          setTimeout(() => {
            setIsSquashing(false);
          }, 1000);
          return;
        }

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

          // Determine if we need to turn before walking
          // We determine facing direction based on the actual destination relative to current position
          // This ensures that even if we bounce off a wall but net movement is still in original direction,
          // we face the correct way.
          const newFacingRight = boundedTarget > prevPos;
          const needsToTurn = newFacingRight !== isFacingRight;

          if (needsToTurn) {
             setIsTurning(true);
             // Schedule the start of walking after the turn
             setTimeout(() => {
                 setIsTurning(false);
                 setIsFacingRight(newFacingRight); // Actually flip direction now
                 setTargetPosition(boundedTarget);
                 setIsWalking(true);
                 setWalkingStep(0);
                 lastStepTimeRef.current = Date.now();
             }, TURN_DURATION);
          } else {
            // No turn needed, start walking immediately
            setIsFacingRight(newFacingRight);
            setTargetPosition(boundedTarget);
            setIsWalking(true);
            setWalkingStep(0);
            lastStepTimeRef.current = Date.now();
          }

          return prevPos; // Current position doesn't change yet
        });
      }
    }, 6000 + Math.random() * 6000); // Less frequent movements

    // Position update interval - updates position continuously
    const positionInterval = setInterval(() => {
      if (isWalking && targetPosition !== null && !isTurning) {
        setPosition(prevPos => {
          const distanceToTarget = targetPosition - prevPos;
          const absDistance = Math.abs(distanceToTarget);
          
          // If we're close enough to the target, stop walking
          if (absDistance < 0.5) {
            setIsWalking(false);
            setWalkingStep(0);
            setTargetPosition(null);
            
            // After stopping, maybe do a "settle" turn or just stop
            // For now, we just stop. 
            // Could optionally turn back to front here if desired, but user asked for before/after walking turns 
            // usually implying the sideways turn. The "Walk-Turning" image is typically for the transition 
            // from Front <-> Side or Side <-> Side.
            // If we want to turn back to "Front" (neutral) we could add logic here.
            // Assuming user meant turning *into* the walk direction.
            
            return targetPosition;
          }
          
          // Otherwise, take a step in the right direction
          const stepSize = Math.min(0.8, absDistance * 0.06);
          const direction = distanceToTarget > 0 ? 1 : -1;
          
          // Update facing direction based on movement direction (should already be set, but safe to enforce)
          // setIsFacingRight(direction > 0);
          
          return prevPos + (direction * stepSize);
        });
      }
    }, 50); // Smooth position updates

    // Separate stepping animation interval
    // This ensures consistent A-B-A-B stepping regardless of movement speed
    const steppingInterval = setInterval(() => {
      if (isWalking && !isTurning) {
        const now = Date.now();
        
        // Only update step if enough time has passed
        if (now - lastStepTimeRef.current >= STEP_INTERVAL) {
          // Toggle between 0 and 1 (A and B images)
          setWalkingStep(prev => (prev === 0 ? 1 : 0));
          lastStepTimeRef.current = now;
        }
      }
    }, 50); // Check frequently but only update when STEP_INTERVAL has passed

    return () => {
      clearInterval(moveInterval);
      clearInterval(positionInterval);
      clearInterval(steppingInterval);
    };
  }, [pet, isWalking, targetPosition, isTurning, isFacingRight, isSquashing, isPlaying]); // Removed lastStepTime dependence

  return { position, isWalking, walkingStep, isFacingRight, isTurning, isSquashing };
}; 