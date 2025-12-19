import React, { createContext, useContext, useState } from 'react';
import type { ToyInventoryItem } from '../types';
import { petService, withErrorHandling } from '../services/firebase';

interface ToyAnimationContextType {
  activeToy: ToyInventoryItem | null;
  setActiveToy: (toy: ToyInventoryItem | null) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

const ToyAnimationContext = createContext<ToyAnimationContextType | undefined>(undefined);

export function ToyAnimationProvider({ children }: { children: React.ReactNode }) {
  const [activeToy, setActiveToy] = useState<ToyInventoryItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSetActiveToy = async (toy: ToyInventoryItem | null) => {
    setActiveToy(toy);
    if (toy) {
      setIsPlaying(true);
      await withErrorHandling(
        async () => {
          const updates = {
            hunger: -10,
            cleanliness: -5,
          };
          await petService.updatePetNeeds(updates);
        },
        "Failed to update pet needs after playing with toy"
      );
      window.setTimeout(() => {
        setIsPlaying(false);
        setActiveToy(null);
      }, 8000);
    }
  };

  // Expose a non-async setter to satisfy strict handler types
  const exposeSetActiveToy = (toy: ToyInventoryItem | null): void => { void handleSetActiveToy(toy); };

  return (
    <ToyAnimationContext.Provider value={{
      activeToy,
      setActiveToy: exposeSetActiveToy,
      isPlaying,
      setIsPlaying
    }}>
      {children}
    </ToyAnimationContext.Provider>
  );
}

export function useToyAnimation() {
  const context = useContext(ToyAnimationContext);
  if (context === undefined) {
    throw new Error('useToyAnimation must be used within a ToyAnimationProvider');
  }
  return context;
} 