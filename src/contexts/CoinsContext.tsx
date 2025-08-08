import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, runTransaction, type DataSnapshot } from 'firebase/database';
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
    const unsubscribe = onValue(coinsRef, (snapshot: DataSnapshot) => {
      const valueUnknown: unknown = snapshot.val();
      if (typeof valueUnknown === 'number') {
        setCoins(valueUnknown);
      } else {
        setCoins(0);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateCoins = async (amount: number) => {
    try {
      const coinsRef = ref(db, 'playerStats/coins');
      await runTransaction(coinsRef, (current) => {
        const currentNum = typeof current === 'number' ? current : 0;
        return currentNum + amount;
      });
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