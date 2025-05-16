// src/components/MapCanvas.tsx
import React, { useEffect, useRef } from 'react';
import type { AppHotspot } from '../types'; // Ensure AppHotspot is imported from your types file
import './MapCanvas.css'; // Styles for the canvas container if any (e.g., .hotspot-canvas-overlay)

interface MapCanvasProps {
  hotspots: AppHotspot[];
  canvasWidth: number;
  canvasHeight: number;
  onHotspotClick: (hotspot: AppHotspot) => void;
  mapWidth: number;
  mapHeight: number;
  gridSize: number;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  hotspots,
  canvasWidth,
  canvasHeight,
  onHotspotClick,
  mapWidth,
  mapHeight,
  gridSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match the grid
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw hotspots for each map in the grid
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const offsetX = x * mapWidth;
        const offsetY = y * mapHeight;

        hotspots.forEach(hotspot => {
          // Draw the hotspot circle
          ctx.beginPath();
          ctx.arc(
            hotspot.x + offsetX,
            hotspot.y + offsetY,
            hotspot.radius || 20,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw the hotspot icon if it exists
          if (hotspot.iconSrc) {
            const img = new Image();
            img.src = hotspot.iconSrc;
            img.onload = () => {
              const size = hotspot.iconSize || 40;
              ctx.drawImage(
                img,
                hotspot.x + offsetX - size / 2,
                hotspot.y + offsetY - size / 2,
                size,
                size
              );
            };
          }
        });
      }
    }
  }, [hotspots, canvasWidth, canvasHeight, mapWidth, mapHeight, gridSize]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check each map in the grid for clicked hotspots
    for (let gridY = 0; gridY < gridSize; gridY++) {
      for (let gridX = 0; gridX < gridSize; gridX++) {
        const offsetX = gridX * mapWidth;
        const offsetY = gridY * mapHeight;

        hotspots.forEach(hotspot => {
          const dx = clickX - (hotspot.x + offsetX);
          const dy = clickY - (hotspot.y + offsetY);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= (hotspot.radius || 20)) {
            onHotspotClick(hotspot);
          }
        });
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="hotspot-canvas-overlay"
      onClick={handleCanvasClick}
      style={{
        width: canvasWidth,
        height: canvasHeight,
      }}
    />
  );
};

export default MapCanvas;