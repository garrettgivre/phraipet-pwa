// src/pages/Explore.tsx
import InfiniteMap from "../components/InfiniteMap";
import "./Explore.css";

/**
 * Wrapper div gets the exact available height between
 * the fixed header (≈96 px) and fixed nav bar (≈88 px).
 * Adjust those values if you tweak header/nav sizes.
 */
export default function Explore() {
  return (
    <div className="exploreViewport">
      <InfiniteMap />
    </div>
  );
}
