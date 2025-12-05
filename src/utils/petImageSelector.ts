import type { Pet } from "../types";

// Helper function to determine pet emotion based on needs
export function getPetEmotionImage(pet: Pet): string {
  if (!pet) return "/pet/Neutral.png";
  
  // Calculate which need is lowest
  const needs = [
    { type: "hunger", value: pet.hunger },
    { type: "happiness", value: pet.happiness },
    { type: "cleanliness", value: pet.cleanliness },
    { type: "affection", value: pet.affection }
  ];
  
  const lowestNeed = needs.reduce((lowest, current) => 
    current.value < lowest.value ? current : lowest
  );
  
  // Determine emotional state based on needs
  if (lowestNeed.value < 20) {
    // Critical need - show negative emotion
    switch (lowestNeed.type) {
      case "hunger": return "/pet/Angry.png";
      case "happiness": return "/pet/Sad.png";
      case "cleanliness": return "/pet/confused.png";
      case "affection": return "/pet/Sad.png";
      default: return "/pet/Neutral.png";
    }
  } else if (lowestNeed.value < 40) {
    // Low need - show mild concern
    return "/pet/Smirking.png";
  }
  // Removed the happy state based on spirit, keeping neutral as default
  
  // Default state - always neutral when needs are fine
  return "/pet/Neutral.png";
}

export function getPetImage(
  pet: Pet | null,
  isPlaying: boolean,
  isWalking: boolean,
  walkingStep: number,
  isSpeaking: boolean = false, // New parameter to check if the pet is speaking
  isTurning: boolean = false // New parameter for turning state
): string {
  if (!pet) return "/pet/Neutral.png";

  // Priority 1: Turning (Transitions)
  if (isTurning) {
      return "/pet/Walk-Turning.png";
  }

  // Priority 2: Happy/Speaking
  if (isSpeaking && pet.spirit > 60) {
    return "/pet/Happy.png";
  }

  // Priority 3: Playing
  if (isPlaying) {
    return "/pet/Happy.png";
  }

  // Priority 4: Walking
  if (isWalking) {
    // Always use the same walking images regardless of direction
    // The flipping will be handled by CSS based on isFacingRight flag
    return walkingStep === 0 ? "/pet/Walk-Sideways-A.png" : "/pet/Walk-Sideways-B.png";
  }

  // Priority 5: Idle / Emotion
  return getPetEmotionImage(pet);
} 