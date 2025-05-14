import type { Pet } from '../types';

// Define thresholds for different need levels.
// Lower values are worse (e.g., very hungry), higher values are better.
// The exact values might need tuning based on how quickly needs change in your game.
const MOOD_TIERS = {
  CRITICALLY_LOW: 15, // Very bad state, urgent attention needed
  LOW: 35,            // Noticeably lacking
  OKAY_ISH: 60,       // Not great, but not terrible
  CONTENT: 85,        // Pretty good
  // HIGH: 100 is implicitly good. For hunger, >100 might be "stuffed".
  // We can add a CRITICALLY_HIGH for hunger if overeating is a negative state.
  // For now, we'll focus on needs being met.
  HUNGER_STUFFED_THRESHOLD: 115, // Example if overeating is bad
};

// Pools of phrases for different mood states.
// Using arrays allows for random selection to add variety.
const moodPhrases = {
  // --- HIGHEST PRIORITY: CRITICAL SINGLE NEEDS ---
  hungryCritical: ["I'm absolutely famished!", "My tummy is rumbling so loudly!", "If I don't eat soon, I might faint...", "So incredibly hungry..."],
  unhappyCritical: ["Everything feels pointless.", "I'm overwhelmed with sadness.", "Is this what despair feels like?", "I just want to hide."],
  dirtyCritical: ["I feel disgusting! Please, a bath!", "This grime is unbearable!", "I can't stand being this dirty!", "Clean me, clean me!"],
  affectionCritical: ["I feel so utterly alone...", "Does anyone even care about me?", "A little attention would mean the world right now.", "Feeling completely neglected."],
  spiritCritical: ["I have no energy for anything.", "Completely drained and listless.", "My spark feels like it's gone out.", "So tired of being tired."],

  // --- COMBINATIONS OF TWO CRITICAL/VERY LOW NEEDS (Examples) ---
  hungryAndUnhappyLow: ["Too hungry to be happy...", "This is the worst, I'm starving and sad!", "A good meal would cheer me up so much."],
  dirtyAndUnhappyLow: ["Feeling grimy and down...", "A bath and some fun would be amazing.", "It's hard to be happy when I feel so yucky."],
  
  // --- SINGLE LOW NEEDS (but not critical) ---
  hungryLow: ["A snack would be lovely.", "Feeling a bit peckish.", "My stomach is starting to make noises."],
  unhappyLow: ["Feeling a bit down today.", "Could use some cheering up.", "Meh..."],
  dirtyLow: ["Could use a quick clean-up.", "Feeling a little untidy.", "A little spruce up would be nice."],
  affectionLow: ["Wouldn't mind some attention.", "A little pat would be nice.", "Feeling a tad overlooked."],
  spiritLow: ["Feeling a bit sluggish.", "Could use an energy boost.", "A little tired."],

  // --- GENERAL POSITIVE STATES ---
  allNeedsMetWell: ["Feeling fantastic today!", "On top of the world!", "Life is pretty great right now!", "Couldn't be better!"],
  allNeedsOkay: ["Doing pretty good!", "Everything's alright.", "No complaints from me!", "Feeling content."],
  
  // --- SPECIAL CASES (like overstuffed) ---
  hungerOverstuffed: ["Oof, I ate too much!", "So full... maybe no more food for a bit.", "My tummy feels like it's going to pop!"],

  // --- DEFAULT/NEUTRAL ---
  neutral: ["Hmm...", "Just hanging out.", "What shall we do next?", "Pondering the meaning of Phraipets..."]
};

/**
 * Selects a random phrase from an array of phrases.
 * @param phraseArray - The array of phrases to choose from.
 * @returns A random phrase from the array.
 */
function getRandomPhrase(phraseArray: string[]): string {
  if (!phraseArray || phraseArray.length === 0) {
    // Fallback if a category is somehow empty, though it shouldn't be with this setup.
    return "I'm feeling... a certain way."; 
  }
  return phraseArray[Math.floor(Math.random() * phraseArray.length)];
}

/**
 * Determines the pet's current mood phrase based on its needs.
 * The logic is prioritized: critical needs take precedence.
 * @param pet - The pet object containing its current need values.
 * @returns A string representing the pet's current mood.
 */
export function getPetMoodPhrase(pet: Pet | null): string {
  if (!pet) {
    return ""; // Or a default "No pet data" message
  }

  const { hunger, happiness, cleanliness, affection, spirit } = pet;

  // --- Prioritized Logic ---

  // 1. Check for CRITICALLY_LOW states first (most urgent)
  if (hunger <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.hungryCritical);
  if (happiness <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.unhappyCritical);
  if (cleanliness <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.dirtyCritical);
  if (affection <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.affectionCritical);
  if (spirit <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.spiritCritical);

  // 2. Check for combined LOW states (examples, can be expanded)
  if (hunger <= MOOD_TIERS.LOW && happiness <= MOOD_TIERS.LOW) {
    return getRandomPhrase(moodPhrases.hungryAndUnhappyLow);
  }
  if (cleanliness <= MOOD_TIERS.LOW && happiness <= MOOD_TIERS.LOW) {
    return getRandomPhrase(moodPhrases.dirtyAndUnhappyLow);
  }
  
  // 3. Check for individual LOW states
  if (hunger <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.hungryLow);
  if (happiness <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.unhappyLow);
  if (cleanliness <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.dirtyLow);
  if (affection <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.affectionLow);
  if (spirit <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.spiritLow);

  // 4. Check for special conditions like being overstuffed
  if (hunger >= MOOD_TIERS.HUNGER_STUFFED_THRESHOLD) {
    return getRandomPhrase(moodPhrases.hungerOverstuffed);
  }

  // 5. Check for general positive states
  // (A more robust check would ensure all relevant needs are above a certain threshold)
  const allGood = 
    hunger >= MOOD_TIERS.CONTENT &&
    happiness >= MOOD_TIERS.CONTENT &&
    cleanliness >= MOOD_TIERS.CONTENT &&
    affection >= MOOD_TIERS.CONTENT &&
    spirit >= MOOD_TIERS.CONTENT;

  if (allGood) {
    return getRandomPhrase(moodPhrases.allNeedsMetWell);
  }

  const allOkayIsh = 
    hunger >= MOOD_TIERS.OKAY_ISH &&
    happiness >= MOOD_TIERS.OKAY_ISH &&
    cleanliness >= MOOD_TIERS.OKAY_ISH &&
    affection >= MOOD_TIERS.OKAY_ISH &&
    spirit >= MOOD_TIERS.OKAY_ISH;

  if (allOkayIsh) {
    return getRandomPhrase(moodPhrases.allNeedsOkay);
  }
  
  // 6. Default/Neutral phrase if no other specific conditions are met
  return getRandomPhrase(moodPhrases.neutral);
}