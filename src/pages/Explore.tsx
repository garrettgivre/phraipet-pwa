import { useNavigate } from "react-router-dom";
import MapCanvas from "../components/MapCanvas";
import type { Hotspot } from "../components/MapCanvas";
import "./Explore.css"; // Add this for any specific Explore page styling

const hotspots: Hotspot[] = [
  {
    id: "sunnybrook",
    x: 175,
    y: 500,
    icon: "/icons/sunnybrook.png",
    route: "/sunnybrook",
  },
  // Add more hotspots here as needed
];

export default function Explore() {
  const navigate = useNavigate();

  return (
    <div className="explorePage">
      <MapCanvas
        width={1536}
        height={1024}
        hotspots={hotspots}
        onNavigate={navigate}
      />
    </div>
  );
}
