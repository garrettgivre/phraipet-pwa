import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./InfiniteMap.css";

export type Hotspot = {
  id: string;
  x: number;  // original pixel X on 1536×1024
  y: number;  // original pixel Y
  icon: string;
  route: string;
};

export default function InfiniteMap({ hotspots = [] }: { hotspots?: Hotspot[] }) {
  const refContainer = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [{ bgX, bgY }, setBg] = useState({ bgX: 0, bgY: 0 });

  useEffect(() => {
    const c = refContainer.current!;
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
      setBg(({ bgX, bgY }) => ({ bgX: bgX + dx, bgY: bgY + dy }));
    };
    const onUp = () => {
      dragging = false;
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

  // update CSS vars
  useEffect(() => {
    const c = refContainer.current;
    if (c) {
      c.style.setProperty("--bg-x", `${bgX}px`);
      c.style.setProperty("--bg-y", `${bgY}px`);
    }
  }, [bgX, bgY]);

  // compute scale
  const vh = window.innerHeight;
  const scale = vh / 1024;

  const handleHotspotClick = (route: string): void => {
    void navigate(route);
  };

  return (
    <div className="panContainer" ref={refContainer}>
      {hotspots.map((hs) => {
        const left = hs.x * scale + bgX;
        const top  = hs.y * scale + bgY;
        return (
          <img
            key={hs.id}
            src={hs.icon}
            className="hotspot"
            style={{ left, top }}
            onClick={() => handleHotspotClick(hs.route)}
            alt=""
          />
        );
      })}
    </div>
  );
}
