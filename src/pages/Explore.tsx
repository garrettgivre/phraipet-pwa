import { useNavigate } from "react-router-dom";
import MapCanvas from "../components/MapCanvas";
import type { Hotspot } from "../components/MapCanvas";

const hotspots: Hotspot[] = [
  { id: "v1", x: 150, y: 500, icon: "/icons/marker.png", route: "/v1" },
  // add more...
];

export default function Explore() {
  const navigate = useNavigate();
  return (
    <MapCanvas
      width={1536}
      height={1024}
      hotspots={hotspots}
      onNavigate={navigate}
    />
  );
}
