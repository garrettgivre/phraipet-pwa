import type { Pet } from "../types";

export function getPetImage(
  pet: Pet | null,
  isPlaying: boolean,
  isWalking: boolean,
  walkingStep: number,
  isFacingRight: boolean
): string {
  if (!pet) return "/pet/neutral.png";

  if (isPlaying) {
    return "/pet/Happy.png";
  }

  if (isWalking) {
    // For side-facing sprites, use the correct version based on direction
    if (isFacingRight) {
      return walkingStep === 0 ? "/pet/Walk-Sideways-B.png" : "/pet/Walk-Sideways-A.png";
    } else {
      return walkingStep === 0 ? "/pet/Walk-Sideways-A.png" : "/pet/Walk-Sideways-B.png";
    }
  }

  return pet.image || "/pet/neutral.png";
} 