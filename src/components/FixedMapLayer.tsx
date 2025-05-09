import InfiniteMap from "./InfiniteMap";
import "./FixedMapLayer.css";

/**
 * Fills everything between header and nav (whose
 * heights we define with CSS variables) and lets
 * the user scroll horizontally forever.
 */
export default function FixedMapLayer() {
  return (
    <div className="fixedMapLayer">
      <InfiniteMap />
    </div>
  );
}
