import { createBrowserRouter } from "react-router-dom";
import Play from "../pages/Play";
import { usePet } from "../contexts/PetContext";

const { currentPet } = usePet();

export const router = createBrowserRouter([
  {
    path: "/play",
    element: <Play pet={currentPet} />
  }
]); 