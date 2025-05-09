import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

/** 
 * Type-only export of a map marker spec 
 */
export type MapLocation = {
  id: string;
  x: number;         // pixel offset from left of one map image
  y: number;         // pixel offset from top of one map image
  icon: string;      // e.g. "/icons/pink-dot.png"
  onClick?: () => void;
};

interface InfiniteMapProps {
  locations?: MapLocation[];
}

export default function InfiniteMap({ locations = [] }: InfiniteMapProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imgWidthRef = useRef(0);
  const IMG_SRC = "/maps/world.png";

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Measure image width & jump to middle copy
    const img = new Image();
    img.src = IMG_SRC;
    img.onload = () => {
      imgWidthRef.current = img.width;
      scroller.scrollLeft = img.width;
    };

    // Wrap-around logic
    const onScroll = () => {
      const W = imgWidthRef.current;
      if (scroller.scrollLeft <= 0) scroller.scrollLeft = W;
      else if (scroller.scrollLeft >= W * 2) scroller.scrollLeft = W;
    };

    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mapScroller" ref={scrollerRef}>
      {[0, 1, 2].map((tileIdx) => (
        <div key={tileIdx} className="mapFrame">
          <img
            src={IMG_SRC}
            alt="world map"
            draggable={false}
            className="mapImage"
          />
          {locations.map((loc) => (
            <img
              key={`${loc.id}-${tileIdx}`}
              src={loc.icon}
              draggable={false}
              className="mapMarker"
              style={{
                left: loc.x + tileIdx * imgWidthRef.current,
                top: loc.y,
              }}
              onClick={loc.onClick}
              alt=""
            />
          ))}
        </div>
      ))}
    </div>
  );
}
