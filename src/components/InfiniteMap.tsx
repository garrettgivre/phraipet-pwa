import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./InfiniteMap.css";

export type Hotspot = {
  id: string;
  x: number;    // pixel on 1536×1024
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
  const navigate = useNavigate();
  const [{ bgX, bgY }, setBg] = useState({ bgX: 0, bgY: 0 });

  useEffect(() => {
    const c = containerRef.current!;
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
      setBg(({ bgX, bgY }) => ({ bgX: bgX + dx, bgY: bgY + dy }));
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

  // apply background position
  useEffect(() => {
    const c = containerRef.current;
    if (c) c.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }, [bgX, bgY]);

  // compute scale
  const vh = window.innerHeight;
  const scale = vh / 1024;
  const tileW = 1536 * scale;
  const tileH = vh; // because background-size auto 100vh

  return (
    <div className="panContainer" ref={containerRef}>
      {hotspots.map((hs) => {
        // raw on infinite
        const rawX = hs.x * scale + bgX;
        const rawY = hs.y * scale + bgY;
        // wrap into main tile
        const screenX = ((rawX % tileW) + tileW) % tileW;
        const screenY = ((rawY % tileH) + tileH) % tileH;
        return (
          <button
            key={hs.id}
            className="hotspotWrapper"
            style={{ left: screenX, top: screenY }}
            onClick={() => navigate(hs.route)}
          >
            <img src={hs.icon} className="hotspot" alt="" />
          </button>
        );
      })}
    </div>
  );
}
