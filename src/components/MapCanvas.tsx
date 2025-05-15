// src/components/MapCanvas.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';
import type { AppHotspot } from '../types';
import './MapCanvas.css'; // Standard CSS import

interface MapCanvasProps {
  mapImageUrl: string;
  hotspots: AppHotspot[];
  mapPixelWidth: number;    // Intrinsic pixel width of the map image
  mapPixelHeight: number;   // Intrinsic pixel height of the map image
}

const MapCanvas: React.FC<MapCanvasProps> = ({ 
  mapImageUrl, 
  hotspots,
  mapPixelWidth,
  mapPixelHeight 
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container div
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [loadedHotspotImages, setLoadedHotspotImages] = useState<Record<string, HTMLImageElement>>({});

  // Load main map image
  useEffect(() => {
    const img = new Image();
    img.src = mapImageUrl;
    img.onload = () => setMapImage(img);
    img.onerror = () => console.error(`Failed to load map image: ${mapImageUrl}`);
  }, [mapImageUrl]);

  // Preload hotspot icon images
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};
    const iconHotspots = hotspots.filter(h => h.iconSrc);
    if (iconHotspots.length === 0) {
      setLoadedHotspotImages({});
      return;
    }

    let imagesLoadedCount = 0;
    iconHotspots.forEach(hotspot => {
      if (hotspot.iconSrc && !images[hotspot.iconSrc]) { // Check if already loading/loaded
        const img = new Image();
        img.src = hotspot.iconSrc;
        images[hotspot.iconSrc] = img; // Add to images map immediately to prevent re-loading
        img.onload = () => {
          imagesLoadedCount++;
          if (imagesLoadedCount === iconHotspots.length) {
            setLoadedHotspotImages(images);
          }
        };
        img.onerror = () => {
          console.error(`Failed to load hotspot icon: ${hotspot.iconSrc}`);
          imagesLoadedCount++; // Still count as "attempted" to not block
          if (imagesLoadedCount === iconHotspots.length) {
            setLoadedHotspotImages(images); // Set even if some failed, they won't draw
          }
        };
      }
    });
  }, [hotspots]);

  // Drawing logic - memoized with useCallback
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !mapImage || !containerRef.current || mapPixelWidth === 0 || mapPixelHeight === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const mapAspectRatio = mapPixelWidth / mapPixelHeight;
    
    let canvasDrawWidth = containerWidth;
    let canvasDrawHeight = containerWidth / mapAspectRatio;

    if (canvasDrawHeight > containerHeight) {
        canvasDrawHeight = containerHeight;
        canvasDrawWidth = containerHeight * mapAspectRatio;
    }
    
    canvas.width = canvasDrawWidth;
    canvas.height = canvasDrawHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / mapPixelWidth;
    const scaleY = canvas.height / mapPixelHeight;
    const effectiveScale = Math.min(scaleX, scaleY); // Use a single scale for icons to keep aspect

    hotspots.forEach(hotspot => {
      const drawX = hotspot.x * scaleX;
      const drawY = hotspot.y * scaleY;
      const icon = hotspot.iconSrc ? loadedHotspotImages[hotspot.iconSrc] : null;
      const baseIconSize = 32; // Base size of icon in pixels (can be adjusted)
      const iconDrawSize = baseIconSize * effectiveScale;

      if (icon && icon.complete && icon.naturalHeight !== 0) {
        ctx.drawImage(icon, drawX - iconDrawSize / 2, drawY - iconDrawSize / 2, iconDrawSize, iconDrawSize);
      } else {
        const fallbackRadius = 10 * effectiveScale;
        ctx.beginPath();
        ctx.arc(drawX, drawY, fallbackRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fill();
        ctx.lineWidth = Math.max(1, 2 * effectiveScale);
        ctx.strokeStyle = '#FF0000';
        ctx.stroke();
      }

      // Optional: Draw hotspot name (adjust font size with scale)
      const fontSize = Math.max(10, 12 * effectiveScale); // Min font size 10px
      ctx.fillStyle = 'black';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'white'; // For text outline
      ctx.lineWidth = Math.max(1, 3 * effectiveScale);
      ctx.strokeText(hotspot.name, drawX, drawY + iconDrawSize / 2 + fontSize * 1.2); // Position below icon
      ctx.fillText(hotspot.name, drawX, drawY + iconDrawSize / 2 + fontSize * 1.2);
    });
  }, [mapImage, hotspots, loadedHotspotImages, mapPixelWidth, mapPixelHeight]);

  // Effect for drawing and resizing
  useEffect(() => {
    drawCanvas(); // Initial draw
    
    // Resize observer for responsive canvas redrawing
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.unobserve(container);
  }, [drawCanvas]); // drawCanvas is memoized

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !mapImage || mapPixelWidth === 0 || mapPixelHeight === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleXDisplay = canvas.width / rect.width;
    const scaleYDisplay = canvas.height / rect.height;

    const clickXCanvas = (event.clientX - rect.left) * scaleXDisplay;
    const clickYCanvas = (event.clientY - rect.top) * scaleYDisplay;

    const mapToCanvasScaleX = canvas.width / mapPixelWidth;
    const mapToCanvasScaleY = canvas.height / mapPixelHeight;
    const effectiveIconScale = Math.min(mapToCanvasScaleX, mapToCanvasScaleY);


    for (const hotspot of hotspots) {
      const hotspotCanvasX = hotspot.x * mapToCanvasScaleX;
      const hotspotCanvasY = hotspot.y * mapToCanvasScaleY;
      const baseIconHitRadius = 16; // Half of baseIconSize (32px)
      const clickableRadius = baseIconHitRadius * effectiveIconScale;

      const distance = Math.sqrt(
        Math.pow(clickXCanvas - hotspotCanvasX, 2) + 
        Math.pow(clickYCanvas - hotspotCanvasY, 2)
      );

      if (distance < clickableRadius) {
        if (hotspot.route) {
          navigate(hotspot.route);
        }
        break; 
      }
    }
  };

  return (
    // Assign ref to the container
    <div ref={containerRef} className="map-canvas-container"> 
      <canvas ref={canvasRef} onClick={handleCanvasClick} />
    </div>
  );
};

export default MapCanvas;