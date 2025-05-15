// src/pages/Explore.tsx
// 'React' import removed as it's not needed with modern JSX transforms.
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

// Define the conceptual size of your scrollable world.
// This could be based on how many tiles you want or a fixed large area.
// For example, if your tile is 1200x800, and you want a 3x3 grid of it:
const WORLD_PIXEL_WIDTH = 3600; // Example: 3 * 1200
const WORLD_PIXEL_HEIGHT = 2400; // Example: 3 * 800

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  // Path to your world map background image (this image will be tiled)
  const mapTileImageUrl = "/maps/world_map_background.png"; 

  useEffect(() => {
    let isMounted = true; 

    const fetchMapHotspotData = async () => {
      if (!isMounted) return;
      setIsLoading(true); 
      setError(null);
      setHotspots([]); 

      try {
        // Fetch the Tiled JSON data for hotspot locations
        const response = await fetch('/maps/world_map_data.json'); // This JSON defines hotspot locations
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();
        
        // Hotspots are defined relative to the Tiled map's origin (0,0)
        // which we are treating as the top-left of our conceptual WORLD_PIXEL_WIDTH/HEIGHT.
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");
        
        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map(obj => ({
            id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
            name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Hotspot',
            // Coordinates from Tiled are used directly as they are in world space
            x: obj.x + (obj.width / 2), 
            y: obj.y + (obj.height / 2), 
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
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMapHotspotData();

    return () => {
        isMounted = false; 
    };
  }, []); // mapTileImageUrl is static, so not needed in deps if defined outside

  if (isLoading) {
    return <div className="explore-status-message explore-loading">Loading Map Data...</div>;
  }

  if (error) {
    return <div className="explore-status-message explore-error">Error loading map: {error}</div>;
  }
  
  return (
    <div className="explore-page"> {/* This div will handle scrolling */}
      <div 
        className="map-scrollable-content" 
        style={{ 
          width: `${WORLD_PIXEL_WIDTH}px`, 
          height: `${WORLD_PIXEL_HEIGHT}px`,
          backgroundImage: `url(${mapTileImageUrl})`,
        }}
      >
        <MapCanvas 
          // mapImageUrl is no longer passed, canvas is transparent
          hotspots={hotspots}
          // Pass the full world dimensions for the canvas drawing surface
          canvasWidth={WORLD_PIXEL_WIDTH} 
          canvasHeight={WORLD_PIXEL_HEIGHT}
        />
      </div>
    </div>
  );
}