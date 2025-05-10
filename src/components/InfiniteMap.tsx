import { useRef, useEffect } from "react";
import "./InfiniteMap.css";

export default function InfiniteMap() {
  const cRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const c = cRef.current;
    if (!c) return;
    let dragging = false;
    let lastX=0, lastY=0;

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      c.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY=e.clientY;
      pos.current.x += dx; pos.current.y += dy;
      c.style.backgroundPosition = `${pos.current.x}px ${pos.current.y}px`;
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

  return <div className="panContainer" ref={cRef} />;
}
