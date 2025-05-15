// src/pages/Explore.tsx
import { useEffect, useState, useRef } from 'react';
import MapCanvas from '../components/MapCanvas'; 
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Explore.css'; 

const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) {
    return undefined;
  }
  return object.properties.find(p => p.name === propertyName)?.value;
};

// Define the conceptual size of your scrollable world.
// Make these significantly larger than any expected screen size for a more "infinite" feel.
const WORLD_PIXEL_WIDTH = 7200; // Example: 6 * 1200 (if your tile is 1200px wide)
const WORLD_PIXEL_HEIGHT = 4800; // Example: 6 * 800 (if your tile is 800px high)

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const explorePageRef = useRef<HTMLDivElement>(null); // Ref for the scrollable .explore-page div

  const mapTileImageUrl = "/maps/world_map_background.png"; 

  useEffect(() => {
    let isMounted = true; 

    const fetchMapHotspotData = async () => {
      if (!isMounted) return;
      setIsLoading(true); 
      setError(null);
      setHotspots([]); 

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
  }, []); // mapTileImageUrl is static, so not needed in deps

  // Effect to scroll to center after loading and when explorePageRef is available
  useEffect(() => {
    if (!isLoading && !error && explorePageRef.current) {
      const scrollableArea = explorePageRef.current;
      // Ensure clientHeight/Width are available (component is mounted and rendered)
      // and that WORLD dimensions are positive
      if (scrollableArea.clientHeight > 0 && scrollableArea.clientWidth > 0 && WORLD_PIXEL_HEIGHT > 0 && WORLD_PIXEL_WIDTH > 0) {
        const scrollTop = (WORLD_PIXEL_HEIGHT - scrollableArea.clientHeight) / 2;
        const scrollLeft = (WORLD_PIXEL_WIDTH - scrollableArea.clientWidth) / 2;
        
        scrollableArea.scrollTop = scrollTop > 0 ? scrollTop : 0;
        scrollableArea.scrollLeft = scrollLeft > 0 ? scrollLeft : 0;
      }
    }
  }, [isLoading, error]); // Run when loading/error state changes, or when explorePageRef becomes available

  // Render loading or error state directly, preventing other content from rendering
  if (isLoading) {
    return <div className="explore-status-message explore-loading">Loading Map Data...</div>;
  }

  if (error) {
    return <div className="explore-status-message explore-error">Error loading map: {error}</div>;
  }
  
  // Render the map if no loading or error
  return (
    // Assign ref to the scrollable div
    <div ref={explorePageRef} className="explore-page"> 
      <div 
        className="map-scrollable-content" 
        style={{ 
          width: `${WORLD_PIXEL_WIDTH}px`, 
          height: `${WORLD_PIXEL_HEIGHT}px`,
          backgroundImage: `url(${mapTileImageUrl})`,
        }}
      >
        <MapCanvas 
          hotspots={hotspots}
          canvasWidth={WORLD_PIXEL_WIDTH} 
          canvasHeight={WORLD_PIXEL_HEIGHT}
        />
      </div>
    </div>
  );
}
