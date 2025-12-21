import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, runTransaction, type DataSnapshot } from 'firebase/database';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '../firebase';

interface CoinsContextType {
  coins: number;
  crystals: number;
  updateCoins: (amount: number) => Promise<void>;
  updateCrystals: (amount: number) => Promise<void>;
}

const CoinsContext = createContext<CoinsContextType | undefined>(undefined);

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(0);
  const [crystals, setCrystals] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Use shared currency path so all users see the same coins and crystals
    const coinsRef = ref(db, `playerStats/coins`);
    const unsubscribeCoins = onValue(coinsRef, (snapshot: DataSnapshot) => {
      const valueUnknown: unknown = snapshot.val();
      if (typeof valueUnknown === 'number') {
        setCoins(valueUnknown);
      } else {
        setCoins(0);
      }
    });

    const crystalsRef = ref(db, `playerStats/crystals`);
    const unsubscribeCrystals = onValue(crystalsRef, (snapshot: DataSnapshot) => {
      const valueUnknown: unknown = snapshot.val();
      if (typeof valueUnknown === 'number') {
        setCrystals(valueUnknown);
      } else {
        setCrystals(0);
      }
    });

    return () => {
      unsubscribeCoins();
      unsubscribeCrystals();
    };
  }, [user]);

  const updateCoins = async (amount: number) => {
    if (!user) return;
    try {
      // Use shared currency path so all users share the same coins
      const coinsRef = ref(db, `playerStats/coins`);
      await runTransaction(coinsRef, (current) => {
        const currentNum = typeof current === 'number' ? current : 0;
        return currentNum + amount;
      });
    } catch (error) {
      console.error('Error updating coins:', error);
      throw error;
    }
  };

  const updateCrystals = async (amount: number) => {
    if (!user) return;
    try {
      // Use shared currency path so all users share the same crystals
      const crystalsRef = ref(db, `playerStats/crystals`);
      await runTransaction(crystalsRef, (current) => {
        const currentNum = typeof current === 'number' ? current : 0;
        return currentNum + amount;
      });
    } catch (error) {
      console.error('Error updating crystals:', error);
      throw error;
    }
  };

  return (
    <CoinsContext.Provider value={{ coins, crystals, updateCoins, updateCrystals }}>
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