// src/pages/Explore.tsx
import { useNavigate } from "react-router-dom";
import MapCanvas from "../components/MapCanvas";
import type { Hotspot } from "../components/MapCanvas";

const hotspots: Hotspot[] = [
  {
    id: "sunnybrook",
    x: 350,
    y: 300,
    icon: "/icons/sunnybrook.png",
    route: "/sunnybrook",
  },
  // …other hotspots…
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
