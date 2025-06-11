import { ref, onValue, set, serverTimestamp, update } from "firebase/database";
import { db } from "../firebase";
import type { Pet, RoomLayers } from "../types";

// Pet related operations
export const petService = {
  subscribeToPet: (callback: (pet: Pet) => void) => {
    console.log("Pet service: Setting up pet subscription");
    const petRef = ref(db, `pets/sharedPet`);
    return onValue(petRef, (snapshot) => {
      console.log("Pet service: Received snapshot", snapshot.exists());
      if (snapshot.exists()) {
        console.log("Pet service: Pet data from Firebase", snapshot.val());
        callback(snapshot.val());
      } else {
        console.log("Pet service: No pet data found in Firebase");
      }
    }, (error) => {
      console.error("Pet service: Error reading pet data", error);
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