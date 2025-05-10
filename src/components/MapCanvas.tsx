// src/components/MapCanvas.tsx
import React, { useRef, useEffect } from "react";
import "./MapCanvas.css";

export type Hotspot = {
  id: string;
  x: number;    // original map pixel X (on 1536×1024)
  y: number;    // original map pixel Y
  icon: string; // URL/path to marker icon
  route: string;
};

export default function MapCanvas({
  width,
  height,
  hotspots = [],
  onNavigate,
}: {
  width: number;       // e.g. 1536
  height: number;      // e.g. 1024
  hotspots?: Hotspot[];
  onNavigate: (route: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offset = useRef({ x: 0, y: 0 });

  // preload map image
  const mapImg = useRef(new Image());
  useEffect(() => {
    mapImg.current.src = "/maps/world.png";
  }, []);

  // preload hotspot icons
  const icons = useRef<Record<string, HTMLImageElement>>({});
  useEffect(() => {
    hotspots.forEach((hs) => {
      const img = new Image();
      img.src = hs.icon;
      icons.current[hs.id] = img;
    });
  }, [hotspots]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let dragging = false;
    let lastX = 0, lastY = 0;

    // scale hotspots to 10%
    const iconScale = 0.1;

    const draw = () => {
      const { x: ox, y: oy } = offset.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // tile count (+2 to cover edges)
      const cols = Math.ceil(canvas.width / width) + 2;
      const rows = Math.ceil(canvas.height / height) + 2;

      // compute rounded modulo offsets
      const modX = Math.round(ox % width);
      const modY = Math.round(oy % height);

      // draw tiled map at integer positions
      for (let row = -1; row < rows - 1; row++) {
        for (let col = -1; col < cols - 1; col++) {
          const dx = col * width + modX;
          const dy = row * height + modY;
          ctx.drawImage(
            mapImg.current,
            Math.round(dx),
            Math.round(dy),
            width,
            height
          );
        }
      }

      // draw hotspots wrapped and scaled
      hotspots.forEach((hs) => {
        const icon = icons.current[hs.id];
        const px = hs.x + ox;
        const py = hs.y + oy;
        // wrap into primary tile
        const sx = ((px % width) + width) % width;
        const sy = ((py % height) + height) % height;
        const iw = icon.width * iconScale;
        const ih = icon.height * iconScale;
        ctx.drawImage(icon, sx - iw / 2, sy - ih, iw, ih);
      });
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX,
            dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      offset.current.x += dx;
      offset.current.y += dy;
      draw();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    // initial draw when map loads
    if (!mapImg.current.complete) {
      mapImg.current.onload = draw;
    } else {
      draw();
    }

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, [hotspots, width, height]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // raw coords in infinite plane
    const rawX = e.clientX - rect.left - offset.current.x;
    const rawY = e.clientY - rect.top  - offset.current.y;
    // wrap into primary tile
    const wrapX = ((rawX % width) + width) % width;
    const wrapY = ((rawY % height) + height) % height;
    // hit-test at scaled size
    const iconScale = 0.1;
    hotspots.forEach((hs) => {
      const icon = icons.current[hs.id];
      const iw = icon.width * iconScale;
      const ih = icon.height * iconScale;
      if (
        wrapX >= hs.x - iw / 2 &&
        wrapX <= hs.x + iw / 2 &&
        wrapY >= hs.y - ih &&
        wrapY <= hs.y
      ) {
        onNavigate(hs.route);
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ display: "block" }}
      onClick={handleClick}
      draggable={false}
    />
  );
}
