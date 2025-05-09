import InfiniteMap from "./InfiniteMap";
import type { MapLocation } from "./InfiniteMap";
import "./FixedMapLayer.css";

interface FixedMapLayerProps {
  locations?: MapLocation[];
}

export default function FixedMapLayer({ locations = [] }: FixedMapLayerProps) {
  return (
    <div className="fixedMapLayer">
      <InfiniteMap locations={locations} />
    </div>
  );
}
