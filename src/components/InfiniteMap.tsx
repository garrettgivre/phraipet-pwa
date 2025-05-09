import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

const IMG_SRC = "/maps/world.png";

export default function InfiniteMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    // After a tick (so sizes are known), center scroll
    requestAnimationFrame(() => {
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      // Position in the middle of the oversized spacer
      c.scrollLeft = cw;
      c.scrollTop = ch;
    });
  }, []);

  return (
    <div className="mapContainer" ref={containerRef}>
      {/* spacer 3× size ensures scroll range */}
      <div className="mapSpacer" />
    </div>
  );
}
