// Define all the possible pet needs
export type Need = "hunger" | "happiness" | "cleanliness" | "affection" | "spirit";

// Individual need info with description for UI purposes
export type NeedInfo = {
  need: Need;
  emoji: string;
  value: number;
  desc: string;
};

// The Pet object structure stored in Firebase and state
export type Pet = {
  hunger: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  spirit: number;
  image: string; // Add this line
};

// Add more types as needed for player profiles, inventory, etc.

// Example for future expansions:

// export type Player = {
//   id: string;
//   username: string;
//   phraipoints: number;
//   pets: Pet[];
// };

// export type Item = {
//   id: string;
//   name: string;
//   category: string;
//   effect: (pet: Pet) => void;
// };
