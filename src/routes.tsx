import { type RouteObject } from "react-router-dom";
import type { Pet, NeedInfo, FoodInventoryItem, GroomingInventoryItem, ToyInventoryItem } from "./types";

import PetPage from "./pages/PetPage";
import Explore from "./pages/Explore";
import Play from "./pages/Play";
import Phraijump from "./pages/Phraijump";
import PhraiCrush from "./pages/PhraiCrush";
import InventoryPage from "./pages/InventoryPage";
import DecorationPage from "./pages/DecorationPage";
import Settings from "./pages/Settings";
import Bank from "./pages/Bank";
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
      path: "/settings",
      element: <Settings />,
    },
    {
      path: "/bank",
      element: <Bank />,
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
    { path: "/explore/creykenp-downtown", element: <World.CreykenpDowntown /> },
    { path: "/explore/creykenp-hq", element: <World.CreykenpHQ /> },
    { path: "/explore/creykenp-stadium", element: <World.CreykenpStadium /> },
    { path: "/explore/prism-sanctum", element: <World.PrismSanctum /> },
    { path: "/explore/everfall-perch", element: <World.EverfallPerch /> },
    { path: "/explore/mistblossom-village", element: <World.MistblossomVillage /> },
    { path: "/explore/reqool-island", element: <World.ReqoolIsland /> },
    { path: "/explore/castaways-knoll", element: <World.CastawaysKnoll /> },
    { path: "/explore/treuse-island", element: <World.TreuseIsland /> }
  ];
} 