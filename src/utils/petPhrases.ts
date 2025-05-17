import type { Pet, ToyInventoryItem } from "../types";

// General phrases for when pet is doing well
const generalPhrases = {
  greetings: [
    "Hello!",
    "Hi there!",
    "Hey!",
    "How are you?",
    "What's up?",
    "Good to see you!"
  ],
  
  happyExpressions: [
    "I'm happy!",
    "Life is good!",
    "Having a great day!",
    "So much fun!",
    "I love you!",
    "You're the best!"
  ],
  
  playfulPhrases: [
    "Let's play!",
    "Wanna play?",
    "I'm so excited!",
    "This is fun!",
    "Yay!",
    "Wheee!"
  ],
  
  casualConversation: [
    "Nice day!",
    "Beautiful weather!",
    "What's new?",
    "Tell me a story!",
    "I'm listening!",
    "That's interesting!"
  ],
  
  affectionatePhrases: [
    "You're my favorite!",
    "I missed you!",
    "You're awesome!",
    "Best friend ever!",
    "You make me happy!",
    "I love spending time with you!"
  ],
  
  sillyPhrases: [
    "Boop!",
    "Waddle waddle!",
    "I'm a happy pet!",
    "Look at me go!",
    "I'm so cute!",
    "Being adorable is my job!"
  ]
};

// Need-based phrases
const needPhrases = {
  hunger: {
    critical: "I'm absolutely famished!",
    low: "I'm hungry!"
  },
  happiness: {
    critical: "I'm bored...",
    low: "I'm feeling a bit down..."
  },
  cleanliness: {
    critical: "I need a bath!",
    low: "I could use a quick clean-up..."
  },
  affection: {
    critical: "I need attention!",
    low: "Could use some cuddles..."
  },
  spirit: {
    critical: "I'm feeling down...",
    low: "Feeling a bit low on energy..."
  }
};

// Get a random phrase from a category
const getRandomPhrase = (phrases: string[]): string => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

// Get a random general phrase
export const getRandomGeneralPhrase = (): string => {
  const categories = Object.values(generalPhrases);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  return getRandomPhrase(randomCategory);
};

// Get a phrase based on pet's needs
export const getNeedBasedPhrase = (pet: Pet): string | undefined => {
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

  if (lowestNeed.value <= 15) {
    return needPhrases[lowestNeed.type as keyof typeof needPhrases].critical;
  } else if (lowestNeed.value <= 30) {
    return needPhrases[lowestNeed.type as keyof typeof needPhrases].low;
  }

  return undefined;
};

// Get a random toy phrase
export const getRandomToyPhrase = (toy: ToyInventoryItem | null): string => {
  if (!toy || !toy.phrases || toy.phrases.length === 0) {
    return "This is fun!";
  }
  return getRandomPhrase(toy.phrases);
};

// Get a random mood phrase based on pet's state
export const getRandomMoodPhrase = (pet: Pet | null): string | undefined => {
  if (!pet) return undefined;

  // Random chance to say something even when needs are fine
  if (Math.random() > 0.7) {
    return getRandomGeneralPhrase();
  }

  return getNeedBasedPhrase(pet);
}; 