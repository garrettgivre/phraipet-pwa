import type { Pet } from '../types';

const MOOD_TIERS = {
  CRITICALLY_LOW: 15,
  LOW: 35,
  OKAY_ISH: 60,
  CONTENT: 85,
  HUNGER_STUFFED_THRESHOLD: 115,
};

const moodPhrases = {
  hungryCritical: ["I'm absolutely famished!", "My tummy is rumbling so loudly!", "If I don't eat soon, I might faint...", "So incredibly hungry..."],
  unhappyCritical: ["Everything feels pointless.", "I'm overwhelmed with sadness.", "Is this what despair feels like?", "I just want to hide."],
  dirtyCritical: ["I feel disgusting! Please, a bath!", "This grime is unbearable!", "I can't stand being this dirty!", "Clean me, clean me!"],
  affectionCritical: ["I feel so utterly alone...", "Does anyone even care about me?", "A little attention would mean the world right now.", "Feeling completely neglected."],
  spiritCritical: ["I have no energy for anything.", "Completely drained and listless.", "My spark feels like it's gone out.", "So tired of being tired."],
  hungryAndUnhappyLow: ["Too hungry to be happy...", "This is the worst, I'm starving and sad!", "A good meal would cheer me up so much."],
  dirtyAndUnhappyLow: ["Feeling grimy and down...", "A bath and some fun would be amazing.", "It's hard to be happy when I feel so yucky."],
  hungryLow: ["A snack would be lovely.", "Feeling a bit peckish.", "My stomach is starting to make noises."],
  unhappyLow: ["Feeling a bit down today.", "Could use some cheering up.", "Meh..."],
  dirtyLow: ["Could use a quick clean-up.", "Feeling a little untidy.", "A little spruce up would be nice."],
  affectionLow: ["Wouldn't mind some attention.", "A little pat would be nice.", "Feeling a tad overlooked."],
  spiritLow: ["Feeling a bit sluggish.", "Could use an energy boost.", "A little tired."],
  allNeedsMetWell: ["Feeling fantastic today!", "On top of the world!", "Life is pretty great right now!", "Couldn't be better!"],
  allNeedsOkay: ["Doing pretty good!", "Everything's alright.", "No complaints from me!", "Feeling content."],
  hungerOverstuffed: ["Oof, I ate too much!", "So full... maybe no more food for a bit.", "My tummy feels like it's going to pop!"],
  neutral: ["Hmm...", "Just hanging out.", "What shall we do next?", "Pondering the meaning of Phraipets..."],
  loading: ["Thinking...", "Just a moment..."] // Added a loading/default state
};

function getRandomPhrase(phraseArray: string[] | undefined): string {
  if (!phraseArray || phraseArray.length === 0) {
    return "I'm feeling... a certain way."; 
  }
  return phraseArray[Math.floor(Math.random() * phraseArray.length)];
}

export function getPetMoodPhrase(pet: Pet | null): string {
  if (!pet || typeof pet !== 'object') {
    // Return a loading or default phrase if pet data isn't fully available yet
    return getRandomPhrase(moodPhrases.loading); 
  }

  // Ensure all need properties are numbers, defaulting to a neutral value (e.g., 50) if not.
  // This prevents errors if pet object is partially formed.
  const hunger = typeof pet.hunger === 'number' && !isNaN(pet.hunger) ? pet.hunger : 50;
  const happiness = typeof pet.happiness === 'number' && !isNaN(pet.happiness) ? pet.happiness : 50;
  const cleanliness = typeof pet.cleanliness === 'number' && !isNaN(pet.cleanliness) ? pet.cleanliness : 50;
  const affection = typeof pet.affection === 'number' && !isNaN(pet.affection) ? pet.affection : 50;
  const spirit = typeof pet.spirit === 'number' && !isNaN(pet.spirit) ? pet.spirit : 50;

  // --- Prioritized Logic ---
  if (hunger <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.hungryCritical);
  if (happiness <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.unhappyCritical);
  if (cleanliness <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.dirtyCritical);
  if (affection <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.affectionCritical);
  if (spirit <= MOOD_TIERS.CRITICALLY_LOW) return getRandomPhrase(moodPhrases.spiritCritical);

  if (hunger <= MOOD_TIERS.LOW && happiness <= MOOD_TIERS.LOW) {
    return getRandomPhrase(moodPhrases.hungryAndUnhappyLow);
  }
  if (cleanliness <= MOOD_TIERS.LOW && happiness <= MOOD_TIERS.LOW) {
    return getRandomPhrase(moodPhrases.dirtyAndUnhappyLow);
  }
  
  if (hunger <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.hungryLow);
  if (happiness <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.unhappyLow);
  if (cleanliness <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.dirtyLow);
  if (affection <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.affectionLow);
  if (spirit <= MOOD_TIERS.LOW) return getRandomPhrase(moodPhrases.spiritLow);

  if (hunger >= MOOD_TIERS.HUNGER_STUFFED_THRESHOLD) {
    return getRandomPhrase(moodPhrases.hungerOverstuffed);
  }

  const allGood = 
    hunger >= MOOD_TIERS.CONTENT &&
    happiness >= MOOD_TIERS.CONTENT &&
    cleanliness >= MOOD_TIERS.CONTENT &&
    affection >= MOOD_TIERS.CONTENT &&
    spirit >= MOOD_TIERS.CONTENT;
  if (allGood) return getRandomPhrase(moodPhrases.allNeedsMetWell);

  const allOkayIsh = 
    hunger >= MOOD_TIERS.OKAY_ISH &&
    happiness >= MOOD_TIERS.OKAY_ISH &&
    cleanliness >= MOOD_TIERS.OKAY_ISH &&
    affection >= MOOD_TIERS.OKAY_ISH &&
    spirit >= MOOD_TIERS.OKAY_ISH;
  if (allOkayIsh) return getRandomPhrase(moodPhrases.allNeedsOkay);
  
  return getRandomPhrase(moodPhrases.neutral);
}