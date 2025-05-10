// src/components/InfiniteMap.tsx
import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./InfiniteMap.css";

export interface Hotspot {
  id: string;
  x: number;          // background‑relative X (px from top-left)
  y: number;          // background‑relative Y
  icon: string;       // e.g. "/icons/marker.png"
  route: string;      // React Router path to navigate to
}

export default function InfiniteMap({
  hotspots = [],
}: {
  hotspots?: Hotspot[];
}) {
  const cRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // track background offset
  const pos = useRef({ x: 0, y: 0 });
  const [, tick] = useState(0);

  useEffect(() => {
    const c = cRef.current;
    if (!c) return;
    let dragging = false;
    let lastX = 0,
      lastY = 0;

    const down = (e: PointerEvent) => {
      e.preventDefault();
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      c.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const dx = e.clientX - lastX,
        dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      pos.current.x += dx;
      pos.current.y += dy;
      c.style.backgroundPosition = `${pos.current.x}px ${pos.current.y}px`;
      tick((t) => t + 1); // force re‐render to reposition hotspots
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

  return (
    <div className="panContainer" ref={cRef}>
      {hotspots.map((hs) => {
        // Calculate where the hotspot should render, relative to current background position
        const left = hs.x + pos.current.x;
        const top = hs.y + pos.current.y;
        return (
          <img
            key={hs.id}
            src={hs.icon}
            className="hotspot"
            style={{ left, top }}
            onClick={() => navigate(hs.route)}
            alt=""
          />
        );
      })}
    </div>
  );
}
