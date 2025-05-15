// src/components/MapCanvas.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null); 
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [isMapImageInternalLoading, setIsMapImageInternalLoading] = useState(true);
  const [mapImageInternalError, setMapImageInternalError] = useState<string | null>(null);
  const [loadedHotspotImages, setLoadedHotspotImages] = useState<Record<string, HTMLImageElement>>({});

  // Effect to load the main map background image
  useEffect(() => {
    let isMounted = true;
    setIsMapImageInternalLoading(true);
    setMapImageInternalError(null);
    setMapImage(null); 

    if (!mapImageUrl) {
        if (isMounted) {
            setMapImageInternalError("Map image URL is missing.");
            setIsMapImageInternalLoading(false);
        }
        return;
    }

    const img = new Image();
    img.src = mapImageUrl;
    img.onload = () => {
      if (isMounted) {
        setMapImage(img);
        setIsMapImageInternalLoading(false);
      }
    };
    img.onerror = () => {
      if (isMounted) {
        console.error(`MapCanvas.tsx: Failed to load map image: ${mapImageUrl}`);
        setMapImageInternalError(`Failed to load map image.`);
        setIsMapImageInternalLoading(false);
      }
    };
    // Cleanup function to set isMounted to false when the component unmounts
    return () => { isMounted = false; };
  }, [mapImageUrl]);

  // Effect to preload hotspot icon images
  useEffect(() => {
    let isMounted = true;
    const images: Record<string, HTMLImageElement> = {};
    // Filter hotspots that have an iconSrc defined
    const iconHotspots = hotspots.filter(h => h.iconSrc);
    
    if (iconHotspots.length === 0) {
      if (isMounted) setLoadedHotspotImages({}); // No icons to load
      return;
    }

    let imagesToLoadCount = 0;
    // Count how many new unique icons need to be loaded
    iconHotspots.forEach(hotspot => {
        if (hotspot.iconSrc && !loadedHotspotImages[hotspot.iconSrc] && !images[hotspot.iconSrc]) {
            imagesToLoadCount++;
        }
    });

    if (imagesToLoadCount === 0) { // All icons already processed or no new icons
        if (isMounted) setLoadedHotspotImages(current => ({...current, ...images}));
        return;
    }
    
    let imagesLoadedCount = 0;
    iconHotspots.forEach(hotspot => {
      // Load only if iconSrc exists and not already loaded/loading
      if (hotspot.iconSrc && !loadedHotspotImages[hotspot.iconSrc] && !images[hotspot.iconSrc]) { 
        const img = new Image();
        img.src = hotspot.iconSrc;
        images[hotspot.iconSrc] = img; // Add to current batch to avoid re-triggering
        img.onload = () => {
          imagesLoadedCount++;
          if (imagesLoadedCount === imagesToLoadCount && isMounted) {
            // All new icons in this batch are loaded, update state
            setLoadedHotspotImages(prev => ({...prev, ...images}));
          }
        };
        img.onerror = () => {
          console.error(`Failed to load hotspot icon: ${hotspot.iconSrc}`);
          imagesLoadedCount++; // Count as "attempted"
          if (imagesLoadedCount === imagesToLoadCount && isMounted) {
            setLoadedHotspotImages(prev => ({...prev, ...images})); // Update state even if some failed
          }
        };
      }
    });
    return () => { isMounted = false; };
  }, [hotspots, loadedHotspotImages]); // Depend on hotspots and loadedHotspotImages to handle dynamic changes

  // Memoized function to draw everything on the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    // Ensure all necessary elements and dimensions are available
    if (!canvas || !container || mapPixelWidth === 0 || mapPixelHeight === 0) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context from canvas.");
      return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    // If container has no size yet, don't attempt to draw
    if (containerWidth === 0 || containerHeight === 0) return;

    // Calculate canvas drawing dimensions to maintain aspect ratio
    const mapAspectRatio = mapPixelWidth / mapPixelHeight;
    let canvasDrawWidth = containerWidth;
    let canvasDrawHeight = containerWidth / mapAspectRatio;

    if (canvasDrawHeight > containerHeight) {
        canvasDrawHeight = containerHeight;
        canvasDrawWidth = containerHeight * mapAspectRatio;
    }
    
    // Set the actual drawing size of the canvas
    canvas.width = canvasDrawWidth;
    canvas.height = canvasDrawHeight;

    // Clear the canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Display loading message if map image is still loading
    if (isMapImageInternalLoading) {
        ctx.fillStyle = '#555'; // Dark grey for loading text
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Loading map image...", canvas.width / 2, canvas.height / 2);
        return; // Don't draw further if image isn't ready
    }

    // Display error message if map image failed to load
    if (mapImageInternalError || !mapImage) {
        ctx.fillStyle = 'red';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(mapImageInternalError || "Error: Map image unavailable.", canvas.width / 2, canvas.height / 2);
        return; // Don't draw further if image is errored
    }
    
    // Draw the main map image, scaled to fit the canvas
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    // Calculate scaling factors from original map pixels to canvas pixels
    const scaleX = canvas.width / mapPixelWidth;
    const scaleY = canvas.height / mapPixelHeight;
    // Use a single effective scale for icons to maintain their aspect ratio
    const effectiveScale = Math.min(scaleX, scaleY);

    // Draw each hotspot
    hotspots.forEach(hotspot => {
      const drawX = hotspot.x * scaleX; // Scaled X position
      const drawY = hotspot.y * scaleY; // Scaled Y position
      const icon = hotspot.iconSrc ? loadedHotspotImages[hotspot.iconSrc] : null;
      const baseIconSize = 32; // Base size of icon in pixels (can be adjusted)
      const iconDrawSize = baseIconSize * effectiveScale; // Scaled icon size

      // Draw icon if loaded, otherwise draw a fallback circle
      if (icon && icon.complete && icon.naturalHeight !== 0) {
        ctx.drawImage(icon, drawX - iconDrawSize / 2, drawY - iconDrawSize / 2, iconDrawSize, iconDrawSize);
      } else {
        const fallbackRadius = Math.max(5, 10 * effectiveScale); // Ensure a minimum visible size
        ctx.beginPath();
        ctx.arc(drawX, drawY, fallbackRadius, 0, 2 * Math.PI, false);
        // Orange if icon was specified but failed to load, Red if no icon was specified
        ctx.fillStyle = hotspot.iconSrc ? 'rgba(255, 165, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)'; 
        ctx.fill();
        ctx.lineWidth = Math.max(1, 2 * effectiveScale);
        ctx.strokeStyle = hotspot.iconSrc ? '#FFA500' : '#FF0000';
        ctx.stroke();
      }

      // Draw hotspot name below the icon/circle
      const fontSize = Math.max(10, 12 * effectiveScale); // Minimum font size 10px
      ctx.fillStyle = 'black';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'white'; // White outline for better readability
      ctx.lineWidth = Math.max(1, 3 * effectiveScale); // Outline thickness
      // Position text below the icon
      const textYPosition = drawY + iconDrawSize / 2 + fontSize * 1.2; 
      ctx.strokeText(hotspot.name, drawX, textYPosition); 
      ctx.fillText(hotspot.name, drawX, textYPosition);
    });
  }, [mapImage, hotspots, loadedHotspotImages, mapPixelWidth, mapPixelHeight, isMapImageInternalLoading, mapImageInternalError]); // Dependencies for useCallback

  // Effect for initial drawing and handling window resize
  useEffect(() => {
    drawCanvas(); // Initial draw when component mounts or dependencies change
    
    const container = containerRef.current;
    if (!container) return;

    // Use ResizeObserver to redraw canvas when its container size changes
    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });
    resizeObserver.observe(container);

    // Cleanup: unobserve on component unmount
    return () => { 
      if (container) { // Check if container still exists
        resizeObserver.unobserve(container);
      }
    };
  }, [drawCanvas]); // Re-run effect if drawCanvas function instance changes

  // Handles clicks on the canvas to detect hotspot interaction
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Ensure canvas and map image are ready, and no loading/error states
    if (!canvasRef.current || !mapImage || mapPixelWidth === 0 || mapPixelHeight === 0 || isMapImageInternalLoading || mapImageInternalError) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect(); // Get canvas position and size on screen
    
    // Calculate click coordinates relative to the canvas's internal coordinate system
    const scaleXDisplay = canvas.width / rect.width;
    const scaleYDisplay = canvas.height / rect.height;
    const clickXCanvas = (event.clientX - rect.left) * scaleXDisplay;
    const clickYCanvas = (event.clientY - rect.top) * scaleYDisplay;

    // Scaling factors from original map image pixels to current canvas drawing pixels
    const mapToCanvasScaleX = canvas.width / mapPixelWidth;
    const mapToCanvasScaleY = canvas.height / mapPixelHeight;
    const effectiveIconScale = Math.min(mapToCanvasScaleX, mapToCanvasScaleY); // For consistent icon hit area scaling

    // Iterate through hotspots to find if any was clicked
    for (const hotspot of hotspots) {
      const hotspotCanvasX = hotspot.x * mapToCanvasScaleX; // Hotspot's center X on canvas
      const hotspotCanvasY = hotspot.y * mapToCanvasScaleY; // Hotspot's center Y on canvas
      const baseIconHitRadius = 16; // Base hit radius (e.g., half of 32px base icon size)
      const clickableRadius = Math.max(10, baseIconHitRadius * effectiveIconScale); // Scaled hit radius, with a minimum

      // Calculate distance from click to hotspot center
      const distance = Math.sqrt(
        Math.pow(clickXCanvas - hotspotCanvasX, 2) + 
        Math.pow(clickYCanvas - hotspotCanvasY, 2)
      );

      // If click is within the hotspot's clickable radius
      if (distance < clickableRadius) {
        if (hotspot.route) {
          navigate(hotspot.route); // Navigate to the hotspot's defined route
        }
        break; // Stop checking other hotspots once one is found
      }
    }
  };

  return (
    <div ref={containerRef} className="map-canvas-container"> 
      <canvas ref={canvasRef} onClick={handleCanvasClick} />
    </div>
  );
};

export default MapCanvas;
