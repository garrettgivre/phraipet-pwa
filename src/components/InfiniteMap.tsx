import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./InfiniteMap.css";

export type Hotspot = {
  id: string;
  x: number;
  y: number;
  icon: string;
  route: string;
};

export default function InfiniteMap({
  hotspots = [],
}: {
  hotspots?: Hotspot[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // track translation in px
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const c = contentRef.current!;
    let dragging = false;
    let lastX = 0, lastY = 0;

    const down = (e: PointerEvent) => {
      e.preventDefault();
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      c.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      setOffset(({ x, y }) => ({ x: x + dx, y: y + dy }));
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      c.releasePointerCapture(e.pointerId);
    };

    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointerleave", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointerleave", up);
    };
  }, []);

  // compute scale once
  const vh = window.innerHeight;
  const scale = vh / 1024;

  return (
    <div className="panContainer" ref={containerRef}>
      <div
        className="panContent"
        ref={contentRef}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* background layer */}
        <div className="mapLayer" />
        {/* hotspots */}
        {hotspots.map((hs) => (
          <button
            key={hs.id}
            className="hotspotWrapper"
            style={{
              left: hs.x,
              top: hs.y,
            }}
            onClick={() => navigate(hs.route)}
          >
            <img src={hs.icon} className="hotspot" alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
