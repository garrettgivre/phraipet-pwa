import { useRef, useEffect } from "react";
import "./InfiniteMap.css";

export default function InfiniteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    // Remove centering—start at top-left (0,0)
    // c.style.backgroundPosition = "0px 0px";

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
      c.style.cursor = "grabbing";
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      pos.current.x += dx;
      pos.current.y += dy;
      c.style.backgroundPosition = `${pos.current.x}px ${pos.current.y}px`;
    };

    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      dragging.current = false;
      c.releasePointerCapture(e.pointerId);
      c.style.cursor = "grab";
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

  return <div className="panContainer" ref={containerRef} />;
}
