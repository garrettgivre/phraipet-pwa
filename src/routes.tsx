import { type RouteObject } from "react-router-dom";
import type { Pet, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "./types";

import PetPage from "./pages/PetPage";
import Explore from "./pages/Explore";
import Play from "./pages/Play";
import Phraijump from "./pages/Phraijump";
import PhraiCrush from "./pages/PhraiCrush";
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
import RescuePals from "./pages/RescuePals";
import Settings from "./pages/Settings";
import LocationDummy from "./pages/LocationDummy";
import * as World from "./pages/World/Locations";

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
      path: "/explore/:locationId",
      element: <LocationDummy />,
    },
    {
      path: "/play",
      element: <Play />,
    },
    {
      path: "/phraijump",
      element: <Phraijump />,
    },
    {
      path: "/phraicrush",
      element: <PhraiCrush />,
    },
    {
      path: "/rescuepals",
      element: <RescuePals />,
    },
    {
      path: "/settings",
      element: <Settings />,
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
    },
    { path: "/explore/amethyst-spires", element: <World.AmethystSpires /> },
    { path: "/explore/amethyst-woods-entrance", element: <World.AmethystWoodsEntrance /> },
    { path: "/explore/sunnybrook-village", element: <World.SunnybrookVillage /> },
    { path: "/explore/petila-town", element: <World.PetilaTown /> },
    { path: "/explore/revivin-coast", element: <World.RevivinCoast /> },
    { path: "/explore/spiral-gate", element: <World.SpiralGate /> },
    { path: "/explore/sunstep-plateau", element: <World.SunstepPlateau /> },
    { path: "/explore/verdi-stop", element: <World.VerdiStop /> },
    { path: "/explore/essic-town", element: <World.EssicTown /> },
    { path: "/explore/tideglass-depths", element: <World.TideglassDepths /> },
    { path: "/explore/frostember-peak", element: <World.FrostemberPeak /> },
    { path: "/explore/smolderfume-town", element: <World.SmolderfumeTown /> },
    { path: "/explore/mutlich-peak", element: <World.MutlichPeak /> },
    { path: "/explore/ashenroot-ridge", element: <World.AshenrootRidge /> },
    { path: "/explore/revelrid-town", element: <World.RevelridTown /> },
    { path: "/explore/creykenp-city", element: <World.CreykenpCity /> },
    { path: "/explore/prism-sanctum", element: <World.PrismSanctum /> },
    { path: "/explore/everfall-perch", element: <World.EverfallPerch /> },
    { path: "/explore/mistblossom-village", element: <World.MistblossomVillage /> },
    { path: "/explore/reqool-island", element: <World.ReqoolIsland /> },
    { path: "/explore/castaways-knoll", element: <World.CastawaysKnoll /> },
    { path: "/explore/treuse-island", element: <World.TreuseIsland /> }
  ];
} 