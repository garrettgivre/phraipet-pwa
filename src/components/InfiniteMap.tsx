import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

const IMG_SRC = "/maps/world.png";

export default function InfiniteMap() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imgWidthRef = useRef(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Measure the map width and jump to the middle copy
    const img = new Image();
    img.src = IMG_SRC;
    img.onload = () => {
      imgWidthRef.current = img.width;
      scroller.scrollLeft = img.width;
    };

    // Infinite wrap-around
    const onScroll = () => {
      const W = imgWidthRef.current;
      if (scroller.scrollLeft <= 0)      scroller.scrollLeft = W;
      else if (scroller.scrollLeft >= W*2) scroller.scrollLeft = W;
    };

    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mapScroller" ref={scrollerRef}>
      <img src={IMG_SRC} alt="world map" draggable={false} />
      <img src={IMG_SRC} alt="" aria-hidden="true" draggable={false} />
      <img src={IMG_SRC} alt="" aria-hidden="true" draggable={false} />
    </div>
  );
}
