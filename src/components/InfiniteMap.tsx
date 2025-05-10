import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./InfiniteMap.css";

/** Defines a clickable map hotspot */
export type Hotspot = {
  id: string;
  x: number;       // px from left of map background
  y: number;       // px from top of map background
  icon: string;    // URL/path to marker icon
  route: string;   // React Router path to navigate
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

  // render each hotspot in a 3×3 grid
  const tiles = [-1, 0, 1];
  return (
    <div className="panContainer" ref={containerRef}>
      {tiles.map((ty) =>
        tiles.map((tx) =>
          hotspots.map((hs) => {
            const left = `calc(${hs.x}px + var(--bg-x, 0px) + ${tx} * 100vw)`;
            const top = `calc(${hs.y}px + var(--bg-y, 0px) + ${ty} * 100vh)`;
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
