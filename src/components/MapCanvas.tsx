// src/components/MapCanvas.tsx
import React, { useEffect, useRef } from 'react';
import type { AppHotspot } from '../types'; // Ensure AppHotspot is imported from your types file
import './MapCanvas.css'; // Styles for the canvas container if any (e.g., .hotspot-canvas-overlay)

interface MapCanvasProps {
  hotspots: AppHotspot[];
  canvasWidth: number;
  canvasHeight: number;
  onHotspotClick?: (hotspot: AppHotspot) => void;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  hotspots,
  canvasWidth,
  canvasHeight,
  onHotspotClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas actual drawing surface size
    // This should match the conceptual size of the map area being displayed
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas before drawing
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw hotspots
    hotspots.forEach(hotspot => {
      if (hotspot.iconSrc) {
        const img = new Image();
        img.onload = () => {
          const iconSize = hotspot.iconSize || 32; // Default icon size if not specified
          try {
            ctx.drawImage(img, hotspot.x - iconSize / 2, hotspot.y - iconSize / 2, iconSize, iconSize);
          } catch (e) {
            console.error("Error drawing image for hotspot:", hotspot.name, e);
            // Fallback drawing if image draw fails
            drawFallbackHotspot(ctx, hotspot);
          }
        };
        img.onerror = () => {
          console.warn(`Failed to load icon for hotspot: ${hotspot.name} from ${hotspot.iconSrc}`);
          // Fallback drawing if icon fails to load
          drawFallbackHotspot(ctx, hotspot);
        };
        img.src = hotspot.iconSrc;
      } else {
        // Fallback drawing if no iconSrc
        drawFallbackHotspot(ctx, hotspot);
      }
    });
  }, [hotspots, canvasWidth, canvasHeight]); // Redraw when these change

  const drawFallbackHotspot = (ctx: CanvasRenderingContext2D, hotspot: AppHotspot) => {
    const radius = hotspot.radius || 20;
    ctx.fillStyle = 'rgba(0, 100, 255, 0.7)'; // A visible fallback color
    ctx.beginPath();
    ctx.arc(hotspot.x, hotspot.y, radius, 0, 2 * Math.PI);
    ctx.fill();

    if (hotspot.name) {
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(hotspot.name, hotspot.x, hotspot.y + radius + 12); // Adjust text position
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onHotspotClick) return;

    const rect = canvas.getBoundingClientRect();
    // Calculate mouse click position relative to the canvas's drawing surface
    // This accounts for CSS scaling of the canvas element vs. its internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    // Find clicked hotspot (simple circular collision detection)
    // Iterate in reverse if you want to prioritize hotspots drawn last (topmost)
    for (let i = hotspots.length - 1; i >= 0; i--) {
      const hotspot = hotspots[i];
      const distance = Math.sqrt(
        Math.pow(clickX - hotspot.x, 2) + Math.pow(clickY - hotspot.y, 2)
      );
      const clickRadius = hotspot.radius || 20; // Use hotspot's defined radius or a default

      if (distance < clickRadius) {
        onHotspotClick(hotspot);
        return; // Found and handled a hotspot, no need to check others
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="hotspot-canvas-overlay" // Make sure this class styles position, width, height correctly
      onClick={handleCanvasClick}
      style={{ display: 'block' }} // Common practice for canvas elements
      // width and height attributes are set in useEffect to control drawing surface
      // CSS width/height (via className or style prop) control element's display size
    />
  );
};

export default MapCanvas;