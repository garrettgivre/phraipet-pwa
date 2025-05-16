import { ref, onValue, set, serverTimestamp, update } from "firebase/database";
import { db } from "../firebase";
import type { Pet, RoomLayers } from "../types";

// Pet related operations
export const petService = {
  subscribeToPet: (callback: (pet: Pet) => void) => {
    const petRef = ref(db, `pets/sharedPet`);
    return onValue(petRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
  },

  updatePetNeeds: async (updates: Partial<Pet>) => {
    const petRef = ref(db, `pets/sharedPet`);
    const updatesWithTimestamp = {
      ...updates,
      lastNeedsUpdateTime: serverTimestamp()
    };
    return update(petRef, updatesWithTimestamp);
  }
};

// Room related operations
export const roomService = {
  subscribeToRoomLayers: (callback: (layers: RoomLayers) => void) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    return onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
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