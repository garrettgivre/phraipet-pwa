// src/components/InfiniteMap.tsx
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./InfiniteMap.css";

/** Defines a clickable map hotspot */
export type Hotspot = {
  id: string;
  x: number;       // px from left of the map background
  y: number;       // px from top of the map background
  icon: string;    // URL or path to your marker icon
  route: string;   // React Router path to navigate to when clicked
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
    const c = containerRef.current;
    if (!c) return;
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
      // Update CSS variables for background & hotspot positioning
      c.style.setProperty("--bg-x", `${pos.current.x}px`);
      c.style.setProperty("--bg-y", `${pos.current.y}px`);
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

  return (
    <div className="panContainer" ref={containerRef}>
      {hotspots.map((hs) => (
        <img
          key={hs.id}
          src={hs.icon}
          className="hotspot"
          style={{
            transform: `translate(calc(${hs.x}px + var(--bg-x, 0px)), calc(${hs.y}px + var(--bg-y, 0px)))`,
          }}
          onClick={() => navigate(hs.route)}
          alt=""
        />
      ))}
    </div>
  );
}
