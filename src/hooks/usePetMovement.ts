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
  const [walkingStep, setWalkingStep] = useState(0);
  const [isFacingRight, setIsFacingRight] = useState(false);

  useEffect(() => {
    if (!pet) return;

    const moveInterval = setInterval(() => {
      setPosition(prevPos => {
        // Determine direction based on current position
        let direction;
        if (prevPos <= 15) {
          direction = 1; // Must move right
        } else if (prevPos >= 85) {
          direction = -1; // Must move left
        } else {
          direction = Math.random() > 0.5 ? 1 : -1;
        }

        // Calculate new position with a larger movement range
        const movementAmount = 5 + (Math.random() * 5);
        const newPos = prevPos + (direction * movementAmount);
        const boundedPos = Math.max(10, Math.min(90, newPos));

        // Update walking state and direction
        setIsWalking(true);
        // Update facing direction without flipping
        setIsFacingRight(direction > 0);

        // Calculate number of steps based on distance
        const distance = Math.abs(boundedPos - prevPos);
        const stepsPerPixel = 0.1;
        const totalSteps = Math.max(2, Math.floor(distance * stepsPerPixel));
        
        // Start walking animation with synchronized steps
        let currentStep = 0;
        const stepInterval = setInterval(() => {
          if (currentStep < totalSteps) {
            // Update step and position together
            setWalkingStep(currentStep % 2);
            setPosition(prevPos => {
              const stepProgress = (currentStep + 1) / totalSteps;
              const stepDistance = boundedPos - prevPos;
              return prevPos + (stepDistance * stepProgress);
            });
            currentStep++;
          } else {
            clearInterval(stepInterval);
            setIsWalking(false);
            setWalkingStep(0);
          }
        }, 200); // Faster step interval for smoother movement
        
        return prevPos; // Return current position, actual movement happens in step interval
      });
    }, 3000);

    return () => clearInterval(moveInterval);
  }, [pet]);

  return { position, isWalking, walkingStep, isFacingRight };
}; 