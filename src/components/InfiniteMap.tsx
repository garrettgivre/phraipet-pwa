// src/components/InfiniteMap.tsx
import { useRef, useEffect } from "react";
import "./InfiniteMap.css";

export default function InfiniteMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    c.style.overflow = "hidden";

    const onDown = (evt: PointerEvent) => {
      evt.preventDefault();
      c.setPointerCapture(evt.pointerId);
      c.style.cursor = "grabbing";
    };
    const onMove = (evt: PointerEvent) => {
      evt.preventDefault();
      // your drag‑to‑pan logic here…
    };
    const onUp = (evt: PointerEvent) => {
      evt.preventDefault();
      c.releasePointerCapture(evt.pointerId);
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
