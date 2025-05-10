import { useRef, useEffect } from "react";
import "./InfiniteMap.css";

export default function InfiniteMap() {
  const cRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const c = cRef.current;
    if (!c) return;

    // Disable any native scrolling
    c.style.overflow = "hidden";

    const down = (e: PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
      c.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      pos.current.x += dx;
      pos.current.y += dy;
      c.style.backgroundPosition = `${pos.current.x}px ${pos.current.y}px`;
    };
    const up = (e: PointerEvent) => {
      dragging.current = false;
      c.releasePointerCapture(e.pointerId);
      c.style.cursor = "grab";
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
