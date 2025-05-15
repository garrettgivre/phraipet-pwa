// src/pages/Sunnybrook.tsx
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MapCanvas from '../components/MapCanvas';
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Sunnybrook.css';

const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) {
    return undefined;
  }
  const property = object.properties.find(p => p.name === propertyName);
  return property?.value;
};

// Define the conceptual size of your Sunnybrook map area.
// If Sunnybrook is a single screen and doesn't tile/scroll, these should match its background image dimensions.
const SUNNYBROOK_MAP_PIXEL_WIDTH_FALLBACK = 1600; // Example: Adjust
const SUNNYBROOK_MAP_PIXEL_HEIGHT_FALLBACK = 1200; // Example: Adjust


export default function Sunnybrook() {
  const location = useLocation();
  const isSunnybrookRoot = location.pathname === "/sunnybrook";

  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [mapPixelWidth, setMapPixelWidth] = useState(0); 
  const [mapPixelHeight, setMapPixelHeight] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapTileImageUrl = "/maps/sunnybrook_background.png"; 

  useEffect(() => {
    let isMounted = true;
    if (!isSunnybrookRoot) {
      setIsLoading(false); 
      return; 
    }

    const fetchMapDataAndDimensions = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setHotspots([]);
      setMapPixelWidth(0); // Reset dimensions before fetching
      setMapPixelHeight(0);
      
      // 1. Attempt to get map dimensions from the actual background image for Sunnybrook
      try {
        const img = new Image();
        img.src = mapTileImageUrl;
        await new Promise<void>((resolve) => { // No reject needed here, we handle error by falling back
            img.onload = () => {
                if (isMounted) {
                    setMapPixelWidth(img.naturalWidth);
                    setMapPixelHeight(img.naturalHeight);
                }
                resolve();
            };
            img.onerror = () => {
                console.error(`Sunnybrook.tsx: Failed to load map image at ${mapTileImageUrl}. Using fallback dimensions.`);
                if (isMounted) {
                    setMapPixelWidth(SUNNYBROOK_MAP_PIXEL_WIDTH_FALLBACK);
                    setMapPixelHeight(SUNNYBROOK_MAP_PIXEL_HEIGHT_FALLBACK);
                }
                resolve(); // Resolve even on error to allow JSON fetching
            };
        });
      } catch (e) {
          console.error("Sunnybrook.tsx: Exception during image dimension loading:", e);
          if (isMounted) { // Fallback if promise somehow throws
            setMapPixelWidth(SUNNYBROOK_MAP_PIXEL_WIDTH_FALLBACK);
            setMapPixelHeight(SUNNYBROOK_MAP_PIXEL_HEIGHT_FALLBACK);
          }
      }

      // 2. Fetch Tiled JSON for hotspots
      // This runs after dimensions are attempted (either successfully or fallback)
      try {
        const response = await fetch('/maps/sunnybrook_map_data.json'); 
        if (!response.ok) {
          throw new Error(`Failed to fetch Sunnybrook map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");
        
        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map(obj => ({
            id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
            name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Location',
            x: obj.x + (obj.width / 2), 
            y: obj.y + (obj.height / 2), 
            route: getTiledObjectProperty(obj, 'route') || `/sunnybrook`, 
            iconSrc: getTiledObjectProperty(obj, 'iconSrc') || undefined,
          }));
          if (isMounted) setHotspots(processedHotspots);
        } else {
          console.warn("Could not find 'Hotspots' object layer in Sunnybrook map data.");
          if (isMounted) setHotspots([]);
        }
      } catch (err) {
        console.error("Error loading or processing Sunnybrook map data:", err);
        if (isMounted) {
            setError(err instanceof Error ? err.message : String(err));
            setHotspots([]);
        }
      } finally {
        if (isMounted) setIsLoading(false); // All loading attempts done
      }
    };

    fetchMapDataAndDimensions();
    return () => { isMounted = false; };
  }, [isSunnybrookRoot, mapTileImageUrl]);

  if (!isSunnybrookRoot) {
    return <Outlet />; 
  }

  if (isLoading) return <div className="sunnybrook-status-message sunnybrook-loading">Loading Sunnybrook Map...</div>;
  if (error) return <div className="sunnybrook-status-message sunnybrook-error">Error: {error}</div>;
  if (mapPixelWidth === 0 || mapPixelHeight === 0) { 
    return <div className="sunnybrook-status-message sunnybrook-loading">Initializing map dimensions...</div>;
  }

  return (
    <div className="sunnybrook-page">
      <div 
        className="map-scrollable-content" // Re-using class for consistency, can be styled differently via .sunnybrook-page .map-scrollable-content
        style={{ 
          width: `${mapPixelWidth}px`, 
          height: `${mapPixelHeight}px`,
          backgroundImage: `url(${mapTileImageUrl})`,
          backgroundRepeat: 'no-repeat', // Sunnybrook likely doesn't tile
          backgroundSize: 'contain',    // Or 'cover', depending on desired fit
          backgroundPosition: 'center center',
        }}
      >
        <MapCanvas 
          hotspots={hotspots}
          canvasWidth={mapPixelWidth}
          canvasHeight={mapPixelHeight}
        />
      </div>
    </div>
  );
}
