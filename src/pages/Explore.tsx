import InfiniteMap from "../components/InfiniteMap";
import type { MapLocation } from "../components/InfiniteMap";

const locations: MapLocation[] = [
  {
    id: "first-spot",
    x: 600,
    y: 300,
    icon: "/icons/pink-dot.png",
    onClick: () => alert("You clicked the first spot!")
  },
  // add more...
];

export default function Explore() {
  return <InfiniteMap locations={locations} />;
}
