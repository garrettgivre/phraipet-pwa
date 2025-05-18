import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase';

interface CoinsContextType {
  coins: number;
  updateCoins: (amount: number) => Promise<void>;
}

const CoinsContext = createContext<CoinsContextType | undefined>(undefined);

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const coinsRef = ref(db, 'playerStats/coins');
    
    // Force set coins to 10,000
    set(coinsRef, 10000);
    
    const unsubscribe = onValue(coinsRef, (snapshot) => {
      const coinsData = snapshot.val();
      setCoins(coinsData || 0);
    });

    return () => unsubscribe();
  }, []);

  const updateCoins = async (amount: number) => {
    try {
      const coinsRef = ref(db, 'playerStats/coins');
      const newAmount = coins + amount;
      await set(coinsRef, newAmount);
      setCoins(newAmount);
    } catch (error) {
      console.error('Error updating coins:', error);
      throw error;
    }
  };

  return (
    <CoinsContext.Provider value={{ coins, updateCoins }}>
      {children}
    </CoinsContext.Provider>
  );
}

export function useCoins() {
  const context = useContext(CoinsContext);
  if (context === undefined) {
    throw new Error('useCoins must be used within a CoinsProvider');
  }
  return context;
} 