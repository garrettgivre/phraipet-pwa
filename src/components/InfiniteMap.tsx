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
  const navigate = useNavigate();

  // State holds the current background offset
  const [{ bgX, bgY }, setBg] = useState({ bgX: 0, bgY: 0 });

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
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      setBg(({ bgX, bgY }) => ({ bgX: bgX + dx, bgY: bgY + dy }));
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

  // On each render, apply the bgX/bgY to the container style
  useEffect(() => {
    const c = containerRef.current;
    if (c) {
      c.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }
  }, [bgX, bgY]);

  const vw = window.innerWidth, vh = window.innerHeight;
  const tiles = [-1, 0, 1];

  return (
    <div className="panContainer" ref={containerRef}>
      {tiles.map((ty) =>
        tiles.map((tx) =>
          hotspots.map((hs) => {
            const left = hs.x + bgX + tx * vw;
            const top = hs.y + bgY + ty * vh;
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
