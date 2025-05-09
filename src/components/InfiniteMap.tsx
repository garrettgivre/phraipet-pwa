import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

const IMG_SRC = "/maps/world.png";

export default function InfiniteMap() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imgSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Load image to measure its width & height
    const img = new Image();
    img.src = IMG_SRC;
    img.onload = () => {
      imgSizeRef.current = { w: img.width, h: img.height };
      // Start centered on the middle tile
      scroller.scrollLeft = img.width;
      scroller.scrollTop = img.height;
    };

    const onScroll = () => {
      const { w, h } = imgSizeRef.current;
      if (scroller.scrollLeft <= 0) scroller.scrollLeft = w;
      else if (scroller.scrollLeft >= w * 2) scroller.scrollLeft = w;
      if (scroller.scrollTop <= 0) scroller.scrollTop = h;
      else if (scroller.scrollTop >= h * 2) scroller.scrollTop = h;
    };

    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mapScroller" ref={scrollerRef}>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <img
            key={`${row}-${col}`}
            src={IMG_SRC}
            alt="world map"
            draggable={false}
            className="mapTile"
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
          />
        ))
      )}
    </div>
  );
}
