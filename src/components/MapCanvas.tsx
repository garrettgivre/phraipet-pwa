// src/components/MapCanvas.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppHotspot } from '../types';
import './MapCanvas.css'; 

interface MapCanvasProps {
  // mapImageUrl is removed; canvas is now transparent
  hotspots: AppHotspot[];
  canvasWidth: number;    // Full width of the conceptual map area (drawing surface)
  canvasHeight: number;   // Full height of the conceptual map area
}

const MapCanvas: React.FC<MapCanvasProps> = ({ 
  hotspots,
  canvasWidth, // Renamed from mapPixelWidth
  canvasHeight // Renamed from mapPixelHeight
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // containerRef is removed, canvas directly uses its parent's flow for CSS sizing if needed
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
          console.error(`Failed to load hotspot icon: ${hotspot.iconSrc}`);
          imagesLoadedCount++; 
          if (imagesLoadedCount === imagesToLoadCount && isMounted) {
            setLoadedHotspotImages(prev => ({...prev, ...images}));
          }
        };
      }
    });
    return () => { isMounted = false; };
  }, [hotspots, loadedHotspotImages]);

  // Drawing logic for hotspots on a transparent canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth === 0 || canvasHeight === 0) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context from canvas.");
      return;
    }

    // Set canvas drawing surface size to the full world dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear the canvas (it's transparent, so this ensures no old drawings)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hotspots are drawn at their absolute world coordinates. No scaling needed here
    // as the canvas drawing surface IS the world.
    hotspots.forEach(hotspot => {
      const drawX = hotspot.x; // Use direct world coordinates
      const drawY = hotspot.y; // Use direct world coordinates
      const icon = hotspot.iconSrc ? loadedHotspotImages[hotspot.iconSrc] : null;
      const baseIconSize = 32; // Base size of icon in pixels for the world map
      // Icon size remains constant relative to the world map, no scaling based on canvas view needed.

      if (icon && icon.complete && icon.naturalHeight !== 0) {
        ctx.drawImage(icon, drawX - baseIconSize / 2, drawY - baseIconSize / 2, baseIconSize, baseIconSize);
      } else {
        const fallbackRadius = 10; 
        ctx.beginPath();
        ctx.arc(drawX, drawY, fallbackRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = hotspot.iconSrc ? 'rgba(255, 165, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)'; 
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = hotspot.iconSrc ? '#FFA500' : '#FF0000';
        ctx.stroke();
      }

      const fontSize = 12; // Fixed font size for world map
      ctx.fillStyle = 'black';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'white'; 
      ctx.lineWidth = 3; 
      const textYPosition = drawY + baseIconSize / 2 + fontSize * 1.2; 
      ctx.strokeText(hotspot.name, drawX, textYPosition); 
      ctx.fillText(hotspot.name, drawX, textYPosition);
    });
  }, [hotspots, loadedHotspotImages, canvasWidth, canvasHeight]); // Depend on world dimensions

  // Effect for initial drawing
  useEffect(() => {
    drawCanvas(); 
  }, [drawCanvas]); // Redraw when hotspots or dimensions change

  // Click handler for hotspots
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || canvasWidth === 0 || canvasHeight === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect(); // Position of canvas element on screen
    
    // Calculate click coordinates relative to the canvas element
    const clickXOnElement = event.clientX - rect.left;
    const clickYOnElement = event.clientY - rect.top;

    // Convert click coordinates on the (potentially CSS-scaled) canvas element
    // to coordinates on the canvas's internal drawing surface (world coordinates).
    const worldX = (clickXOnElement / canvas.clientWidth) * canvas.width;
    const worldY = (clickYOnElement / canvas.clientHeight) * canvas.height;
    
    const baseIconHitRadius = 16; // Base hit radius (half of 32px base icon size)

    for (const hotspot of hotspots) {
      // Hotspot x,y are already world coordinates
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
    // The canvas element itself will be sized by CSS to match its parent (.map-scrollable-content)
    // but its drawing surface (width/height attributes) is set to the full world size.
    <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick} 
        className="hotspot-canvas-overlay"
        style={{
            position: 'absolute', // Overlay on top of the background div
            top: 0,
            left: 0,
            // CSS width/height make the canvas element responsive to its container
            // The drawing inside is on a larger surface if canvasWidth/Height are large
            width: `${canvasWidth}px`,  // CSS width should match drawing surface width
            height: `${canvasHeight}px`, // CSS height should match drawing surface height
        }}
    />
  );
};

export default MapCanvas;
