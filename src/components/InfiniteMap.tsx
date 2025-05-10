// src/components/InfiniteMap.tsx
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./InfiniteMap.css";

/** Defines a clickable map hotspot */
export type Hotspot = {
  id: string;
  x: number;     // px from left of the map original
  y: number;     // px from top of the map original
  icon: string;
  route: string;
};

export default function InfiniteMap({
  hotspots = [],
}: {
  hotspots?: Hotspot[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const c = containerRef.current!;
    let dragging = false;
    let lastX = 0,
      lastY = 0;

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      c.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      pos.current.x += dx;
      pos.current.y += dy;
      // move the background
      c.style.backgroundPosition = `${pos.current.x}px ${pos.current.y}px`;
      // trigger repaint so hotspots move (reading pos in render)
      // could use forceUpdate, but inline style will read fresh pos
    };

    const onUp = (e: PointerEvent) => {
      dragging = false;
      c.releasePointerCapture(e.pointerId);
    };

    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointerleave", onUp);
    return () => {
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("pointerleave", onUp);
    };
  }, []);

  const tiles = [-1, 0, 1];
  // Capture current pos locally so renders use same values
  const { x: offsetX, y: offsetY } = pos.current;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  return (
    <div className="panContainer" ref={containerRef}>
      {tiles.map((ty) =>
        tiles.map((tx) =>
          hotspots.map((hs) => {
            // compute each hotspot’s on-screen position
            const left = hs.x + offsetX + tx * vw;
            const top = hs.y + offsetY + ty * vh;
            return (
              <button
                key={`${hs.id}-${tx}-${ty}`}
                className="hotspotWrapper"
                style={{ left, top }}
                onClick={() => navigate(hs.route)}
              >
                <img src={hs.icon} className="hotspot" alt="" />
              </button>
            );
          })
        )
      )}
    </div>
  );
}
