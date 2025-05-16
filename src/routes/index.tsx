import type { RouteObject } from "react-router-dom";
import type { Pet, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem, NeedInfo } from "../types";
import PetPage from "../pages/PetPage";
import Explore from "../pages/Explore";
import Play from "../pages/Play";
import Sunnybrook from "../pages/Sunnybrook";
import SBAdoption from "../pages/Sunnybrook/SBAdoption";
import SBClinic from "../pages/Sunnybrook/SBClinic";
import SBClock from "../pages/Sunnybrook/SBClock";
import SBFountain from "../pages/Sunnybrook/SBFountain";
import SBFurniture from "../pages/Sunnybrook/SBFurniture";
import SBMart from "../pages/Sunnybrook/SBMart";
import SBStall from "../pages/Sunnybrook/SBStall";
import SBToy from "../pages/Sunnybrook/SBToy";
import InventoryPage from "../pages/InventoryPage";

export interface RouteProps {
  pet: Pet | null;
  handleFeedPet: (foodItem: FoodInventoryItem) => void;
  handleGroomPet: (groomingItem: GroomingInventoryItem) => void;
  handlePlayWithToy: (toyItem: ToyInventoryItem) => void;
  handleIncreaseAffection: (amount: number) => void;
  needInfo: NeedInfo[];
}

export function createRoutes(props: RouteProps): RouteObject[] {
  return [
    {
      path: "/",
      element: <PetPage pet={props.pet} needInfo={props.needInfo} onIncreaseAffection={props.handleIncreaseAffection} />
    },
    {
      path: "/explore",
      element: <Explore />
    },
    {
      path: "/play",
      element: <Play />
    },
    {
      path: "/inventory",
      element: <InventoryPage
        pet={props.pet}
        onFeedPet={props.handleFeedPet}
        onGroomPet={props.handleGroomPet}
        onPlayWithToy={props.handlePlayWithToy}
      />
    },
    {
      path: "/sunnybrook",
      element: <Sunnybrook />
    },
    {
      path: "/sunnybrook/Adoption",
      element: <SBAdoption />
    },
    {
      path: "/sunnybrook/SBClinic",
      element: <SBClinic />
    },
    {
      path: "/sunnybrook/SBClock",
      element: <SBClock />
    },
    {
      path: "/sunnybrook/SBFountain",
      element: <SBFountain />
    },
    {
      path: "/sunnybrook/SBFurniture",
      element: <SBFurniture />
    },
    {
      path: "/sunnybrook/SBMart",
      element: <SBMart />
    },
    {
      path: "/sunnybrook/SBStall",
      element: <SBStall />
    },
    {
      path: "/sunnybrook/SBToy",
      element: <SBToy />
    }
  ];
} 