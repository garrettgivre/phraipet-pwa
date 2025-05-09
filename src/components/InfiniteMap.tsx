import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

export default function InfiniteMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    // After layout, center the scroll in the middle
    requestAnimationFrame(() => {
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      c.scrollLeft = cw;
      c.scrollTop = ch;
    });
  }, []);

  return (
    <div className="mapContainer" ref={containerRef}>
      <div className="mapSpacer" />
    </div>
  );
}
