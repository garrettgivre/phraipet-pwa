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
// This should match the dimensions of your sunnybrook_map_data.json if it's not meant to tile,
// or be larger if you intend for Sunnybrook itself to be scrollable beyond a single screen.
// For now, let's assume it's a fixed size based on its Tiled export or background image.
// We will try to get this from the Tiled map data itself if possible, or use a fallback.
// Let's use a placeholder, this should ideally come from the Tiled map's width/height in pixels
// or the background image dimensions if it's a single, non-tiling image.
const SUNNYBROOK_MAP_PIXEL_WIDTH = 1600; // Example: Adjust to your Sunnybrook map's intended full pixel width
const SUNNYBROOK_MAP_PIXEL_HEIGHT = 1200; // Example: Adjust to your Sunnybrook map's intended full pixel height


export default function Sunnybrook() {
  const location = useLocation();
  const isSunnybrookRoot = location.pathname === "/sunnybrook";

  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  // mapPixelWidth/Height now refer to the dimensions of the conceptual map for MapCanvas
  const [mapPixelWidth, setMapPixelWidth] = useState(SUNNYBROOK_MAP_PIXEL_WIDTH); 
  const [mapPixelHeight, setMapPixelHeight] = useState(SUNNYBROOK_MAP_PIXEL_HEIGHT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Path to your Sunnybrook map background image (this image will be tiled or fill the scrollable content)
  const mapTileImageUrl = "/maps/sunnybrook_background.png"; 

  useEffect(() => {
    let isMounted = true;
    if (!isSunnybrookRoot) {
      setIsLoading(false); 
      return; 
    }

    const fetchMapData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setHotspots([]);
      // We'll set mapPixelWidth/Height based on the Tiled data or a fixed value,
      // not necessarily by loading mapTileImageUrl here if it's just for CSS background.

      try {
        const response = await fetch('/maps/sunnybrook_map_data.json'); 
        if (!response.ok) {
          throw new Error(`Failed to fetch Sunnybrook map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();

        // Attempt to set map dimensions from Tiled data if it represents the full map size
        // This assumes your Tiled map (world_map_data.json) has width/height in tiles and tilewidth/tileheight
        // And that these represent the full pixel dimensions of your map area.
        // If your Tiled map is smaller than your background image and the image tiles,
        // then use the fixed SUNNYBROOK_MAP_PIXEL_WIDTH/HEIGHT.
        if (tiledMapData.width && tiledMapData.tilewidth && tiledMapData.height && tiledMapData.tileheight) {
            if (isMounted) {
                // This would be if the Tiled map itself defines the total pixel dimensions
                // setMapPixelWidth(tiledMapData.width * tiledMapData.tilewidth);
                // setMapPixelHeight(tiledMapData.height * tiledMapData.tileheight);
                // For now, using predefined constants for clarity, assuming Sunnybrook is one screen.
                // If Sunnybrook is larger and tiles, these constants should reflect the total tiled size.
                // If sunnybrook_background.png is the exact size and doesn't tile, load it to get dimensions:
                const img = new Image();
                img.src = mapTileImageUrl;
                img.onload = () => {
                    if (isMounted) {
                        setMapPixelWidth(img.naturalWidth);
                        setMapPixelHeight(img.naturalHeight);
                    }
                };
                img.onerror = () => { // Fallback to constants if image load fails
                    if (isMounted) {
                        setMapPixelWidth(SUNNYBROOK_MAP_PIXEL_WIDTH);
                        setMapPixelHeight(SUNNYBROOK_MAP_PIXEL_HEIGHT);
                    }
                }
            }
        } else {
            if (isMounted) { // Fallback to constants
                setMapPixelWidth(SUNNYBROOK_MAP_PIXEL_WIDTH);
                setMapPixelHeight(SUNNYBROOK_MAP_PIXEL_HEIGHT);
            }
        }


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
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMapData();
    return () => { isMounted = false; };
  }, [isSunnybrookRoot, mapTileImageUrl]); // mapTileImageUrl is a dependency now

  if (!isSunnybrookRoot) {
    return <Outlet />; 
  }

  if (isLoading) return <div className="sunnybrook-status-message sunnybrook-loading">Loading Sunnybrook Map...</div>;
  if (error) return <div className="sunnybrook-status-message sunnybrook-error">Error: {error}</div>;
  if (mapPixelWidth === 0 || mapPixelHeight === 0) {
    return <div className="sunnybrook-status-message sunnybrook-loading">Initializing map dimensions...</div>;
  }

  return (
    <div className="sunnybrook-page"> {/* This div will handle scrolling if content is larger */}
      <div 
        className="map-scrollable-content" // Similar class name for consistency
        style={{ 
          width: `${mapPixelWidth}px`,  // Use the determined/fallback pixel width
          height: `${mapPixelHeight}px`, // Use the determined/fallback pixel height
          backgroundImage: `url(${mapTileImageUrl})`,
          backgroundRepeat: mapPixelWidth > 2000 ? 'repeat' : 'no-repeat', // Example: only repeat if very large
          backgroundSize: mapPixelWidth > 2000 ? 'auto' : 'cover', // Cover if not repeating
          backgroundPosition: 'top left',
        }}
      >
        <MapCanvas 
          hotspots={hotspots}
          canvasWidth={mapPixelWidth}   // Pass the full map dimensions
          canvasHeight={mapPixelHeight} // Pass the full map dimensions
        />
      </div>
    </div>
  );
}