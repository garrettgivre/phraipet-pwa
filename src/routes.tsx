import { type RouteObject } from "react-router-dom";
import type { Pet, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "./types";

import PetPage from "./pages/PetPage";
import Explore from "./pages/Explore";
import Play from "./pages/Play";
import InventoryPage from "./pages/InventoryPage";
import DecorationPage from "./pages/DecorationPage";
import Sunnybrook from "./pages/Sunnybrook";
import SBAdoption from "./pages/Sunnybrook/SBAdoption"; 
import SBClock from "./pages/Sunnybrook/SBClock";
import SBClinic from "./pages/Sunnybrook/SBClinic";
import SBFountain from "./pages/Sunnybrook/SBFountain";
import SBFurniture from "./pages/Sunnybrook/SBFurniture";
import SBMart from "./pages/Sunnybrook/SBMart";
import SBStall from "./pages/Sunnybrook/SBStall";
import SBToy from "./pages/Sunnybrook/SBToy";
import SBToyStore from "./pages/Sunnybrook/SBToyStore";
import SBFurnitureStore from "./pages/Sunnybrook/SBFurnitureStore";

interface RouteProps {
  pet: Pet | null;
  needInfo: NeedInfo[];
  handleFeedPet: (foodItem: FoodInventoryItem) => void;
  handleGroomPet: (groomingItem: GroomingInventoryItem) => void;
  handlePlayWithToy: (toyItem: ToyInventoryItem) => void;
  handleIncreaseAffection: (amount: number) => void;
}

export function createRoutes({
  pet,
  needInfo,
  handleFeedPet,
  handleGroomPet,
  handlePlayWithToy,
  handleIncreaseAffection,
}: RouteProps): RouteObject[] {
  return [
    {
      path: "/",
      element: <PetPage 
        pet={pet} 
        needInfo={needInfo} 
        onIncreaseAffection={handleIncreaseAffection}
        onFeedPet={handleFeedPet}
        onGroomPet={handleGroomPet}
        onPlayWithToy={handlePlayWithToy}
      />,
    },
    {
      path: "/explore",
      element: <Explore />,
    },
    {
      path: "/play",
      element: <Play />,
    },
    {
      path: "/inventory",
      element: <InventoryPage 
        pet={pet} 
        onFeedPet={handleFeedPet} 
        onGroomPet={handleGroomPet} 
        onPlayWithToy={handlePlayWithToy}
      />
    },
    {
      path: "/decorations",
      element: <DecorationPage />
    },
    {
      path: "/sunnybrook",
      element: <Sunnybrook />,
    },
    {
      path: "/sunnybrook/SBAdoption",
      element: <SBAdoption />,
    },
    {
      path: "/sunnybrook/SBClock",
      element: <SBClock />,
    },
    {
      path: "/sunnybrook/SBClinic",
      element: <SBClinic />,
    },
    {
      path: "/sunnybrook/SBFountain",
      element: <SBFountain />,
    },
    {
      path: "/sunnybrook/SBFurniture",
      element: <SBFurniture />,
    },
    {
      path: "/sunnybrook/SBMart",
      element: <SBMart />,
    },
    {
      path: "/sunnybrook/SBStall",
      element: <SBStall />,
    },
    {
      path: "/sunnybrook/SBToy",
      element: <SBToy />,
    },
    {
      path: "/sunnybrook/SBToyStore",
      element: <SBToyStore />,
    },
    {
      path: "/sunnybrook/SBFurnitureStore",
      element: <SBFurnitureStore />,
    }
  ];
} 