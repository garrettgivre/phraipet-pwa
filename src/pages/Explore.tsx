import FixedMapLayer from "../components/FixedMapLayer";
import type { Hotspot } from "../components/InfiniteMap";
import markerIcon from "/icons/marker.png";

const hotspots: Hotspot[] = [
  {
    id: "location1",
    x: 500,
    y: 300,
    icon: markerIcon,
    route: "/location/1",
  },
  {
    id: "location2",
    x: 1200,
    y: 450,
    icon: markerIcon,
    route: "/location/2",
  },
];

export default function Explore() {
  return <FixedMapLayer hotspots={hotspots} />;
}
