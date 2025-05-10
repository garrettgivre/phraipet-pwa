import InfiniteMap from "./InfiniteMap";
import type { Hotspot } from "./InfiniteMap";
import "./FixedMapLayer.css";

interface FixedMapLayerProps {
  hotspots?: Hotspot[];
}

export default function FixedMapLayer({ hotspots = [] }: FixedMapLayerProps) {
  return <InfiniteMap hotspots={hotspots} />;
}
