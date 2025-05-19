import { useState, useEffect } from "react";
import type { NeedInfo, Pet } from "../types";

interface PetPageProps {
  pet: Pet;
  needInfo: NeedInfo[];
  onIncreaseAffection: () => void;
}

const PetPage: React.FC<PetPageProps> = ({ pet, needInfo, onIncreaseAffection }) => {
  const [localHungerValue, setLocalHungerValue] = useState<number | null>(null);

  useEffect(() => {
    const hungerNeed = needInfo.find(need => need.name === "hunger");
    if (hungerNeed) {
      setLocalHungerValue(hungerNeed.value);
    }
  }, [needInfo]);

  const updatedNeedInfo = needInfo.map(need => {
    if (need.name === "hunger" && localHungerValue !== null) {
      return { ...need, value: localHungerValue };
    }
    return need;
  });

  return (
    <div className="pet-page">
      {/* Your existing JSX */}
    </div>
  );
};

export default PetPage; 