import { useEffect, useRef } from "react";
import "./InfiniteMap.css";

/**
 * Shows three copies of the same map side‑by‑side and
 * keeps resetting scrollLeft so the user can swipe forever.
 */
const IMG_SRC = "/maps/world.png"; // put your image here

function InfiniteMap() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Once the image loads, jump to the middle copy
    const img = new Image();
    img.src = IMG_SRC;
    img.onload = () => {
      const singleWidth = img.width;
      scroller.scrollLeft = singleWidth;
    };

    // When user hits either edge, teleport back to the middle copy
    const onScroll = () => {
      const totalW = scroller.scrollWidth;
      const singleW = totalW / 3;
      if (scroller.scrollLeft <= 0) scroller.scrollLeft = singleW;
      if (scroller.scrollLeft >= singleW * 2) scroller.scrollLeft = singleW;
    };

    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mapScroller" ref={scrollerRef}>
      {/* three identical copies */}
      <img src={IMG_SRC} alt="world map" draggable={false} />
      <img src={IMG_SRC} alt="" aria-hidden="true" draggable={false} />
      <img src={IMG_SRC} alt="" aria-hidden="true" draggable={false} />
    </div>
  );
}

export default InfiniteMap;
