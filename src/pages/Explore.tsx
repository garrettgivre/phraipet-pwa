// src/pages/Explore.tsx
// 'React' import removed as it's not explicitly needed with modern JSX transforms
import { useEffect, useState } from 'react'; 
import MapCanvas from '../components/MapCanvas'; 
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Explore.css'; 

// Helper function to get a custom property value from a Tiled object
const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) {
    return undefined;
  }
  return object.properties.find(p => p.name === propertyName)?.value;
};

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [mapPixelWidth, setMapPixelWidth] = useState(0);
  const [mapPixelHeight, setMapPixelHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  // Path to your world map background image in the `public` folder
  const mapImageUrl = "/maps/world_map_background.png"; 

  useEffect(() => {
    let isMounted = true; 

    const fetchMapDataAndDimensions = async () => {
      if (!isMounted) return;
      setIsLoading(true); 
      setError(null);
      setMapPixelWidth(0); 
      setMapPixelHeight(0);
      setHotspots([]); 

      let dimensionsAttempted = false;

      // 1. Attempt to get map dimensions from the image
      try {
        const img = new Image();
        img.src = mapImageUrl;
        // Use a promise to await image loading for dimensions
        // 'reject' parameter removed as it's not used in this promise's logic
        await new Promise<void>((resolve) => { 
            img.onload = () => {
                if (isMounted) {
                    setMapPixelWidth(img.naturalWidth);
                    setMapPixelHeight(img.naturalHeight);
                }
                dimensionsAttempted = true;
                resolve();
            };
            img.onerror = () => {
                console.error(`Explore.tsx: Failed to load map image at ${mapImageUrl} to determine dimensions. Using fallback.`);
                if (isMounted) {
                    setMapPixelWidth(1200); // Fallback width
                    setMapPixelHeight(800); // Fallback height
                }
                dimensionsAttempted = true; 
                resolve(); // Resolve even on error to allow JSON fetching to proceed with fallbacks
            };
        });
      } catch (e) {
          console.error("Explore.tsx: Exception during image dimension loading:", e);
          if (isMounted) {
            setMapPixelWidth(1200); 
            setMapPixelHeight(800);
          }
          dimensionsAttempted = true;
      }

      // Ensure dimensions are set (even to fallback) before proceeding
      if (!isMounted || !dimensionsAttempted) {
        if (dimensionsAttempted && isMounted) setIsLoading(false); 
        return;
      }

      // 2. Fetch the Tiled JSON data
      try {
        const response = await fetch('/maps/world_map_data.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");
        
        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map(obj => ({
            id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
            name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Hotspot',
            x: obj.x + (obj.width / 2), // Use center of Tiled object
            y: obj.y + (obj.height / 2), // Use center of Tiled object
            route: getTiledObjectProperty(obj, 'route') || '/',
            iconSrc: getTiledObjectProperty(obj, 'iconSrc') || undefined,
          }));
          if (isMounted) setHotspots(processedHotspots);
        } else {
          console.warn("Could not find 'Hotspots' object layer in map data for Explore page.");
          if (isMounted) setHotspots([]);
        }
      } catch (err) {
        console.error("Error loading or processing Tiled JSON data for Explore page:", err);
        if (isMounted) {
            setError(err instanceof Error ? err.message : String(err));
            setHotspots([]);
        }
      } finally {
        if (isMounted) setIsLoading(false); // All loading attempts (dimensions + JSON) are done
      }
    };

    fetchMapDataAndDimensions();

    return () => {
        isMounted = false; 
    };
  }, [mapImageUrl]);

  if (isLoading) {
    return <div className="explore-status-message explore-loading">Loading Map Data...</div>;
  }

  if (error) {
    return <div className="explore-status-message explore-error">Error loading map: {error}</div>;
  }
  
  if (mapPixelWidth === 0 || mapPixelHeight === 0) {
    // This state should ideally be covered by isLoading, but acts as a safeguard
    return <div className="explore-status-message explore-loading">Initializing map dimensions...</div>;
  }

  return (
    <div className="explore-page">
      <MapCanvas 
        mapImageUrl={mapImageUrl} 
        hotspots={hotspots}
        mapPixelWidth={mapPixelWidth}
        mapPixelHeight={mapPixelHeight}
      />
    </div>
  );
}
