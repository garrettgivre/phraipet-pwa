import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ToyInventoryItem } from '../types';

interface ToyAnimationContextType {
  activeToy: ToyInventoryItem | null;
  setActiveToy: (toy: ToyInventoryItem | null) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

const ToyAnimationContext = createContext<ToyAnimationContextType | null>(null);

export function ToyAnimationProvider({ children }: { children: ReactNode }) {
  const [activeToy, setActiveToy] = useState<ToyInventoryItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <ToyAnimationContext.Provider value={{ activeToy, setActiveToy, isPlaying, setIsPlaying }}>
      {children}
    </ToyAnimationContext.Provider>
  );
}

export function useToyAnimation() {
  const context = useContext(ToyAnimationContext);
  if (!context) {
    throw new Error('useToyAnimation must be used within a ToyAnimationProvider');
  }
  return context;
} 