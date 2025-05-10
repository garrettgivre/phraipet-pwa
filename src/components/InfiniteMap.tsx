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
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const c = contentRef.current!;
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
      setOffset(({ x, y }) => ({ x: x + dx, y: y + dy }));
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

  // compute scale
  const vh = window.innerHeight;
  const scale = vh / 1024;
  const tileW = 1536, tileH = 1024;
  const tiles = [-1, 0, 1];

  return (
    <div className="panContainer">
      <div
        className="panContent"
        ref={contentRef}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* 3×3 tiled images */}
        {tiles.map((ty) =>
          tiles.map((tx) => (
            <img
              key={`tile-${tx}-${ty}`}
              src="/maps/world.png"
              className="mapTile"
              style={{ left: tx * tileW, top: ty * tileH }}
              draggable={false}
            />
          ))
        )}

        {/* hotspots in original coordinates */}
        {hotspots.map((hs) => (
          <button
            key={hs.id}
            className="hotspotWrapper"
            style={{ left: hs.x, top: hs.y }}
            onClick={() => navigate(hs.route)}
          >
            <img src={hs.icon} className="hotspot" alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
