import type { Pet } from "../types";

export const getPetImage = (pet: Pet | null, isPlaying: boolean, isWalking: boolean, walkingStep: number): string => {
  if (!pet) return "/pet/Neutral.png";
  
  // Always use Happy image when playing with toy
  if (isPlaying) return "/pet/Happy.png";

  // Use walking animation when moving
  if (isWalking) {
    // Always use sideways walking animation when moving
    return walkingStep === 0 ? "/pet/Walk-Sideways-A.png" : "/pet/Walk-Sideways-B.png";
  }

  // Check for overstuffed condition first
  if (pet.hunger >= 100) return "/pet/Neutral.png";

  // Get the lowest need value to determine overall mood
  const needs = [
    { value: pet.hunger, type: "hunger" },
    { value: pet.happiness, type: "happiness" },
    { value: pet.cleanliness, type: "cleanliness" },
    { value: pet.affection, type: "affection" },
    { value: pet.spirit, type: "spirit" }
  ];

  const lowestNeed = needs.reduce((min, current) => 
    current.value < min.value ? current : min
  );

  // Map need values to emotions
  if (lowestNeed.value <= 15) {
    switch (lowestNeed.type) {
      case "hunger": return "/pet/Sad.png";
      case "happiness": return "/pet/Sad.png";
      case "cleanliness": return "/pet/Confused.png";
      case "affection": return "/pet/Sad.png";
      case "spirit": return "/pet/Neutral.png";
      default: return "/pet/Neutral.png";
    }
  } else if (lowestNeed.value <= 35) {
    return "/pet/Sad.png";
  } else if (lowestNeed.value >= 50) {
    return "/pet/Happy.png";
  }

  return "/pet/Neutral.png";
}; 