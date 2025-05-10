// src/pages/Sunnybrook.tsx
import { useNavigate } from "react-router-dom";
import "./Sunnybrook.css";

type BuildingArea = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  route: string;
};

const buildingAreas: BuildingArea[] = [
  {
    id: "SBClock",
    left: 40,   // % from left—adjust as needed
    top: 10,    // % from top
    width: 20,  // % of container width
    height: 15, // % of container height
    route: "/sunnybrook/clock",
  },
  {
    id: "SBClinic",
    left: 65,
    top: 12,
    width: 20,
    height: 15,
    route: "/sunnybrook/clinic",
  },
  {
    id: "SBStall",
    left: 10,
    top: 55,
    width: 25,
    height: 20,
    route: "/sunnybrook/stall",
  },
  {
    id: "SBMart",
    left: 60,
    top: 55,
    width: 25,
    height: 20,
    route: "/sunnybrook/mart",
  },
  {
    id: "SBToy",
    left: 10,
    top: 80,
    width: 25,
    height: 15,
    route: "/sunnybrook/toy",
  },
  {
    id: "SBAdoption",
    left: 60,
    top: 80,
    width: 25,
    height: 15,
    route: "/sunnybrook/adoption",
  },
  {
    id: "SBFurniture",
    left: 30,
    top: 35,
    width: 25,
    height: 20,
    route: "/sunnybrook/furniture",
  },
  {
    id: "SBFountain",
    left: 45,
    top: 45,
    width: 20,
    height: 15,
    route: "/sunnybrook/fountain",
  },
];

export default function Sunnybrook() {
  const navigate = useNavigate();

  return (
    <div className="sunnybrook-container">
      <img
        src="/locations/sunnybrook-vertical.png"
        alt="Sunnybrook Village"
        className="sunnybrook-image"
      />

      {buildingAreas.map((area) => (
        <button
          key={area.id}
          className="building-area"
          style={{
            left: `${area.left}%`,
            top: `${area.top}%`,
            width: `${area.width}%`,
            height: `${area.height}%`,
          }}
          onClick={() => navigate(area.route)}
        />
      ))}
    </div>
  );
}
