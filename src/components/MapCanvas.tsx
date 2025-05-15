// src/components/MapCanvas.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppHotspot } from '../types';
import './MapCanvas.css'; // Standard CSS import

interface MapCanvasProps {
  hotspots: AppHotspot[];
  canvasWidth: number;    // Full width of the conceptual map area (drawing surface)
  canvasHeight: number;   // Full height of the conceptual map area
}

const MapCanvas: React.FC<MapCanvasProps> = ({ 
  hotspots,
  canvasWidth, 
  canvasHeight 
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedHotspotImages, setLoadedHotspotImages] = useState<Record<string, HTMLImageElement>>({});

  // Preload hotspot icon images
  useEffect(() => {
    let isMounted = true;
    const images: Record<string, HTMLImageElement> = {};
    const iconHotspots = hotspots.filter(h => h.iconSrc);
    
    if (iconHotspots.length === 0) {
      if (isMounted) setLoadedHotspotImages({});
      return;
    }

    let imagesToLoadCount = 0;
    iconHotspots.forEach(hotspot => {
        if (hotspot.iconSrc && !loadedHotspotImages[hotspot.iconSrc] && !images[hotspot.iconSrc]) {
            imagesToLoadCount++;
        }
    });

    if (imagesToLoadCount === 0) { 
        if (isMounted) setLoadedHotspotImages(current => ({...current, ...images}));
        return;
    }
    
    let imagesLoadedCount = 0;
    iconHotspots.forEach(hotspot => {
      if (hotspot.iconSrc && !loadedHotspotImages[hotspot.iconSrc] && !images[hotspot.iconSrc]) { 
        const img = new Image();
        img.src = hotspot.iconSrc;
        images[hotspot.iconSrc] = img; 
        img.onload = () => {
          imagesLoadedCount++;
          if (imagesLoadedCount === imagesToLoadCount && isMounted) {
            setLoadedHotspotImages(prev => ({...prev, ...images}));
          }
        };
        img.onerror = () => {
          console.error(`MapCanvas: Failed to load hotspot icon: ${hotspot.iconSrc}`);
          imagesLoadedCount++; 
          if (imagesLoadedCount === imagesToLoadCount && isMounted) {
            setLoadedHotspotImages(prev => ({...prev, ...images})); // Update state even if some failed
          }
        };
      }
    });
    return () => { isMounted = false; };
  }, [hotspots, loadedHotspotImages]); // Rerun if hotspots change or already loaded images change

  // Drawing logic for hotspots on a transparent canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth === 0 || canvasHeight === 0) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("MapCanvas: Failed to get 2D context from canvas.");
      return;
    }

    // Set canvas drawing surface size to the full world dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear the canvas (it's transparent, so this ensures no old drawings)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hotspots are drawn at their absolute world coordinates.
    hotspots.forEach(hotspot => {
      const drawX = hotspot.x; // Use direct world coordinates (center of hotspot)
      const drawY = hotspot.y; // Use direct world coordinates (center of hotspot)
      const icon = hotspot.iconSrc ? loadedHotspotImages[hotspot.iconSrc] : null;
      const baseIconSize = 32; // Base size of icon in pixels for the world map

      if (icon && icon.complete && icon.naturalHeight !== 0) {
        // Draw icon centered on the hotspot's x,y
        ctx.drawImage(icon, drawX - baseIconSize / 2, drawY - baseIconSize / 2, baseIconSize, baseIconSize);
      } else {
        // Fallback: draw a simple circle if no icon or icon failed to load
        const fallbackRadius = 10; 
        ctx.beginPath();
        ctx.arc(drawX, drawY, fallbackRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = hotspot.iconSrc ? 'rgba(255, 165, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)'; // Orange if icon failed, Red if no icon
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = hotspot.iconSrc ? '#FFA500' : '#FF0000';
        ctx.stroke();
      }

      // Draw hotspot name below the icon/circle
      const fontSize = 12; // Fixed font size for hotspot names on the map
      ctx.fillStyle = 'black';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'white'; // White outline for better readability
      ctx.lineWidth = 3; 
      const textYPosition = drawY + baseIconSize / 2 + fontSize * 1.2; // Position text below icon
      ctx.strokeText(hotspot.name, drawX, textYPosition); 
      ctx.fillText(hotspot.name, drawX, textYPosition);
    });
  }, [hotspots, loadedHotspotImages, canvasWidth, canvasHeight]);

  // Effect for initial drawing and redrawing when dependencies change
  useEffect(() => {
    drawCanvas(); 
  }, [drawCanvas]); 

  // Handles clicks on the canvas to detect hotspot interaction
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || canvasWidth === 0 || canvasHeight === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect(); // Position of canvas element on screen
    
    // Calculate click coordinates relative to the canvas element's display size
    const clickXOnElement = event.clientX - rect.left;
    const clickYOnElement = event.clientY - rect.top;

    // Convert click coordinates on the (potentially CSS-scaled) canvas element
    // to coordinates on the canvas's internal drawing surface (which are world coordinates).
    // canvas.clientWidth/Height are the CSS-rendered size of the canvas element.
    // canvas.width/height are the drawing surface dimensions.
    const worldX = (clickXOnElement / canvas.clientWidth) * canvas.width;
    const worldY = (clickYOnElement / canvas.clientHeight) * canvas.height;
    
    const baseIconHitRadius = 16; // Base hit radius (e.g., half of 32px base icon size)

    for (const hotspot of hotspots) {
      // Hotspot x,y are already world coordinates (center of hotspot)
      const distance = Math.sqrt(
        Math.pow(worldX - hotspot.x, 2) + 
        Math.pow(worldY - hotspot.y, 2)
      );

      if (distance < baseIconHitRadius) {
        if (hotspot.route) {
          navigate(hotspot.route); 
        }
        break; 
      }
    }
  };

  return (
    // The canvas element itself will be styled via inline styles to match its parent (.map-scrollable-content)
    // but its drawing surface (width/height attributes) is set to the full world size.
    <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick} 
        className="hotspot-canvas-overlay"
        style={{
            position: 'absolute', 
            top: 0,
            left: 0,
            // CSS width/height make the canvas element take up the full world space.
            // This ensures that clicks are mapped correctly to the large drawing surface.
            width: `${canvasWidth}px`,  
            height: `${canvasHeight}px`, 
        }}
    />
  );
};

export default MapCanvas;
