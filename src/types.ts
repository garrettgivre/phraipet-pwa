// src/types.ts
export type Need =
  | "hunger"
  | "happiness"
  | "cleanliness"
  | "affection"
  | "spirit";

/** Core pet record kept in Firebase */
export type Pet = {
  hunger: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  spirit: number; // derived – don’t edit directly
  pose: string; // "Neutral", "Happy", etc.
};
