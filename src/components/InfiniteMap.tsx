import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

/** Named export of the location type */
export type MapLocation = {
  id: string;
  x: number;          // pixel offset from left of single map image
  y: number;          // pixel offset from top of image
  icon: string;       // path to your marker icon
  onClick?: () => void;
};

type InfiniteMapProps = {
  locations?: MapLocation[];
};

export default function InfiniteMap({ locations = [] }: InfiniteMapProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imgWidthRef = useRef(0);
  const IMG_SRC = "/maps/world.png";

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const img = new Image();
    img.src = IMG_SRC;
    img.onload = () => {
      imgWidthRef.current = img.width;
      scroller.scrollLeft = img.width;
    };

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
