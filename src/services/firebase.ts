import { ref, onValue, set, update, type DataSnapshot } from "firebase/database";
import { db } from "../firebase";
import type { Pet, RoomLayers } from "../types";

// Pet related operations
export const petService = {
  subscribeToPet: (callback: (pet: Pet | null) => void) => {
    if (import.meta.env.DEV) console.log("Pet service: Setting up pet subscription");
    const petRef = ref(db, `pets/sharedPet`);
    return onValue(
      petRef,
      (snapshot: DataSnapshot) => {
        if (import.meta.env.DEV) console.log("Pet service: Received snapshot", snapshot.exists());
        if (snapshot.exists()) {
          const value = snapshot.val() as Partial<Pet>;
          if (import.meta.env.DEV) console.log("Pet service: Pet data from Firebase", value);
          callback(value as Pet);
        } else {
          if (import.meta.env.DEV) console.log("Pet service: No pet data found in Firebase");
          callback(null);
        }
      },
      (error) => {
        console.error("Pet service: Error reading pet data", error);
        callback(null);
      }
    );
  },

  updatePetNeeds: async (updates: Partial<Pet>) => {
    const petRef = ref(db, `pets/sharedPet`);
    const updatesWithTimestamp: Partial<Pet> = {
      ...updates,
      lastNeedsUpdateTime: Date.now(),
    };
    return update(petRef, updatesWithTimestamp);
  }
};

// Room related operations
export const roomService = {
  subscribeToRoomLayers: (callback: (layers: RoomLayers | null) => void) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    return onValue(roomRef, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as RoomLayers);
      } else {
        callback(null);
      }
    });
  },

  updateRoomLayers: async (layers: RoomLayers) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    return set(roomRef, layers);
  }
};

// Error handling wrapper
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 