import type { Pet } from "../types";

export function getPetImage(
  pet: Pet | null,
  isPlaying: boolean,
  isWalking: boolean,
  walkingStep: number,
  isFacingRight: boolean
): string {
  if (!pet) return "/assets/pets/default_pet.png";

  if (isPlaying) {
    return "/assets/pets/play.png";
  }

  if (isWalking) {
    // For side-facing sprites, use the correct version based on direction
    if (isFacingRight) {
      return walkingStep === 0 ? "/assets/pets/walk-sideways-b.png" : "/assets/pets/walk-sideways-a.png";
    } else {
      return walkingStep === 0 ? "/assets/pets/walk-sideways-a.png" : "/assets/pets/walk-sideways-b.png";
    }
  }

  return pet.image || "/assets/pets/default_pet.png";
} 