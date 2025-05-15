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
  }, [hotspots, loadedHotspotImages]); 

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

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    hotspots.forEach(hotspot => {
      const drawX = hotspot.x; 
      const drawY = hotspot.y; 
      const icon = hotspot.iconSrc ? loadedHotspotImages[hotspot.iconSrc] : null;
      const baseIconSize = 32; 

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

      const fontSize = 12; 
      ctx.fillStyle = 'black';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'white'; 
      ctx.lineWidth = 3; 
      const textYPosition = drawY + baseIconSize / 2 + fontSize * 1.2; 
      ctx.strokeText(hotspot.name, drawX, textYPosition); 
      ctx.fillText(hotspot.name, drawX, textYPosition);
    });
  }, [hotspots, loadedHotspotImages, canvasWidth, canvasHeight]);

  useEffect(() => {
    drawCanvas(); 
  }, [drawCanvas]); 

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || canvasWidth === 0 || canvasHeight === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect(); 
    
    const clickXOnElement = event.clientX - rect.left;
    const clickYOnElement = event.clientY - rect.top;

    const worldX = (clickXOnElement / canvas.clientWidth) * canvas.width;
    const worldY = (clickYOnElement / canvas.clientHeight) * canvas.height;
    
    const baseIconHitRadius = 16; 

    for (const hotspot of hotspots) {
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
    <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick} 
        className="hotspot-canvas-overlay"
        style={{
            position: 'absolute', 
            top: 0,
            left: 0,
            width: `${canvasWidth}px`,  
            height: `${canvasHeight}px`, 
        }}
    />
  );
};

export default MapCanvas;
