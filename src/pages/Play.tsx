import { useState } from 'react';
import type { Pet } from '../types';
import { getDatabase, ref, get, set } from 'firebase/database';

interface PlayProps {
  pet: Pet | null;
}

export default function Play({ pet }: PlayProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleAddAllItems = async () => {
    const db = getDatabase();
    const inventoryRef = ref(db, 'inventory');
    const petRef = ref(db, 'pet');

    try {
      const [inventorySnapshot, petSnapshot] = await Promise.all([
        get(inventoryRef),
        get(petRef)
      ]);

      const currentInventory = inventorySnapshot.val() || {};
      const currentPet = petSnapshot.val() || {};

      // Update inventory with default items
      const updatedInventory = {
        ...currentInventory,
        // Add your default items here
      };

      // Update pet needs to optimal levels
      const updatedPet = {
        ...currentPet,
        hunger: 100,
        happiness: 100,
        cleanliness: 100,
        affection: 100,
        spirit: 100
      };

      await Promise.all([
        set(inventoryRef, updatedInventory),
        set(petRef, updatedPet)
      ]);

      handleRefresh();
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  if (!pet) {
    return <div>Loading...</div>;
  }

  return (
    <div className="play-page">
      <button onClick={handleRefresh}>Refresh App</button>
      <button onClick={handleAddAllItems}>Add All Items & Fix Pet Needs</button>
    </div>
  );
} 