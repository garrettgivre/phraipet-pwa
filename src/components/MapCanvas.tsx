// src/components/MapCanvas.tsx
import React, { useRef, useEffect } from "react";
import "./MapCanvas.css";

export type Hotspot = {
  id: string;
  x: number;   // original map pixel X
  y: number;   // original map pixel Y
  icon: string;
  route: string;
};

export default function MapCanvas({
  width,
  height,
  hotspots = [],
  onNavigate,
}: {
  width: number;
  height: number;
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
    let lastX = 0,
      lastY = 0;

    // scale factor for icons (50% of natural size)
    const iconScale = 0.5;

    const draw = () => {
      const { x: ox, y: oy } = offset.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // tile count
      const cols = Math.ceil(canvas.width / width) + 1;
      const rows = Math.ceil(canvas.height / height) + 1;

      // draw tiled map
      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          ctx.drawImage(
            mapImg.current,
            col * width + (ox % width),
            row * height + (oy % height),
            width,
            height
          );
        }
      }

      // draw hotspots
      hotspots.forEach((hs) => {
        const icon = icons.current[hs.id];
        const px = hs.x + ox;
        const py = hs.y + oy;
        const sx = ((px % width) + width) % width;
        const sy = ((py % height) + height) % height;

        const iw = icon.width * iconScale;
        const ih = icon.height * iconScale;
        // draw at half-size, bottom-centered
        ctx.drawImage(
          icon,
          sx - iw / 2,
          sy - ih,
          iw,
          ih
        );
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

    // initial draw once images are loaded
    mapImg.current.onload = draw;

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
    const x = e.clientX - rect.left - offset.current.x;
    const y = e.clientY - rect.top - offset.current.y;
    hotspots.forEach((hs) => {
      const icon = icons.current[hs.id];
      const iw = icon.width * 0.5;
      const ih = icon.height * 0.5;
      if (
        x >= hs.x - iw / 2 &&
        x <= hs.x + iw / 2 &&
        y >= hs.y - ih &&
        y <= hs.y
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
    />
  );
}
