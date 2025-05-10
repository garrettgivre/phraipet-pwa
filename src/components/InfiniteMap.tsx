// src/components/InfiniteMap.tsx
import { useRef, useEffect } from "react";
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
  const cRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const c = cRef.current!;
    let dragging = false;
    let lastX = 0, lastY = 0;

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      c.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      pos.current.x += dx; pos.current.y += dy;
      // directly move the background
      c.style.backgroundPosition = `${pos.current.x}px ${pos.current.y}px`;
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
  return (
    <div className="panContainer" ref={cRef}>
      {tiles.map((ty) =>
        tiles.map((tx) =>
          hotspots.map((hs) => {
            const left = `calc(${hs.x}px + ${tx} * 100vw)`;
            const top = `calc(${hs.y}px + ${ty} * 100vh)`;
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
