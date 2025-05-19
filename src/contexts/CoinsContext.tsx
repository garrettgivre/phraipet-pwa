import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase';

interface CoinsContextType {
  coins: number;
  addCoins: (amount: number) => Promise<void>;
  removeCoins: (amount: number) => Promise<void>;
}

const CoinsContext = createContext<CoinsContextType | null>(null);

export const useCoins = () => {
  const context = useContext(CoinsContext);
  if (!context) {
    throw new Error('useCoins must be used within a CoinsProvider');
  }
  return context;
};

export const CoinsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coins, setCoins] = useState<number>(0);

  useEffect(() => {
    const coinsRef = ref(db, 'coins');
    const unsubscribe = onValue(coinsRef, (snapshot) => {
      const value = snapshot.val();
      setCoins(value || 0);
    });

    return () => unsubscribe();
  }, []);

  const addCoins = async (amount: number) => {
    const coinsRef = ref(db, 'coins');
    await set(coinsRef, coins + amount);
  };

  const removeCoins = async (amount: number) => {
    const coinsRef = ref(db, 'coins');
    await set(coinsRef, Math.max(0, coins - amount));
  };

  return (
    <CoinsContext.Provider value={{ coins, addCoins, removeCoins }}>
      {children}
    </CoinsContext.Provider>
  );
}; 