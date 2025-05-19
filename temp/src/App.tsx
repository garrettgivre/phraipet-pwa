import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { CoinsProvider } from './contexts/CoinsContext';
import { InventoryProvider } from './contexts/InventoryContext';
import type { Pet, NeedInfo } from './types';

const defaultPetData: Pet = {
  id: "default",
  name: "Default Pet",
  type: "default",
  hunger: 100,
  happiness: 100,
  cleanliness: 100,
  affection: 0,
  spirit: 100,
  image: "/assets/pets/default.png",
  lastNeedsUpdateTime: Date.now(),
  lastFed: Date.now(),
  lastPlayed: Date.now(),
  lastGroomed: Date.now(),
  lastPet: Date.now(),
  lastSpirit: Date.now(),
  affectionGainedToday: 0,
  lastAffectionGainDate: new Date().toISOString().split('T')[0],
  needs: [
    { name: "hunger", iconSrc: "/assets/icons/needs/hunger.png", value: 100, desc: "Hunger level", maxValue: 100, color: "#FF6B6B" },
    { name: "happiness", iconSrc: "/assets/icons/needs/happiness.png", value: 100, desc: "Happiness level", maxValue: 100, color: "#4ECDC4" },
    { name: "cleanliness", iconSrc: "/assets/icons/needs/cleanliness.png", value: 100, desc: "Cleanliness level", maxValue: 100, color: "#45B7D1" },
    { name: "spirit", iconSrc: "/assets/icons/needs/spirit.png", value: 100, desc: "Spirit level", maxValue: 100, color: "#96CEB4" }
  ]
};

export default function App() {
  const [pet, setPet] = useState<Pet>(defaultPetData);

  useEffect(() => {
    const updateNeeds = () => {
      const now = Date.now();
      const elapsedTime = now - pet.lastNeedsUpdateTime;
      const hoursElapsed = elapsedTime / (1000 * 60 * 60);

      setPet(prevPet => ({
        ...prevPet,
        lastNeedsUpdateTime: now,
        needs: prevPet.needs.map(need => {
          let newValue = need.value;
          switch (need.name) {
            case "hunger":
              newValue = Math.max(0, need.value - (hoursElapsed * 5));
              break;
            case "happiness":
              newValue = Math.max(0, need.value - (hoursElapsed * 3));
              break;
            case "cleanliness":
              newValue = Math.max(0, need.value - (hoursElapsed * 2));
              break;
            case "spirit":
              newValue = Math.max(0, need.value - (hoursElapsed * 1));
              break;
          }
          return { ...need, value: newValue };
        })
      }));
    };

    const interval = setInterval(updateNeeds, 1000 * 60); // Update every minute
    return () => clearInterval(interval);
  }, [pet.lastNeedsUpdateTime]);

  return (
    <React.Fragment>
      <CoinsProvider>
        <InventoryProvider>
          <RouterProvider router={router} />
        </InventoryProvider>
      </CoinsProvider>
    </React.Fragment>
  );
} 