import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

const IMG_SRC = "/maps/world.png";

export default function InfiniteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    const img = new Image();
    img.src = IMG_SRC;
    img.onload = () => {
      sizeRef.current = { w: img.width, h: img.height };
      // center on the middle tile
      c.scrollLeft = img.width;
      c.scrollTop = img.height;
    };

    const onScroll = () => {
      const { w, h } = sizeRef.current;
      if (c.scrollLeft <= 0) c.scrollLeft = w;
      else if (c.scrollLeft >= w * 2) c.scrollLeft = w;
      if (c.scrollTop <= 0) c.scrollTop = h;
      else if (c.scrollTop >= h * 2) c.scrollTop = h;
    };

    c.addEventListener("scroll", onScroll);
    return () => c.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mapContainer" ref={containerRef}>
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <img
            key={`${row}-${col}`}
            src={IMG_SRC}
            alt=""
            className="tile"
            style={{
              top: row * sizeRef.current.h,
              left: col * sizeRef.current.w,
            }}
          />
        ))
      )}
    </div>
  );
}
