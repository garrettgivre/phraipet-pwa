// src/pages/Explore.tsx
import { useEffect, useState } from 'react'; 
import MapCanvas from '../components/MapCanvas'; 
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Explore.css'; 

const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) {
    return undefined;
  }
  return object.properties.find(p => p.name === propertyName)?.value;
};

const WORLD_PIXEL_WIDTH = 7200; 
const WORLD_PIXEL_HEIGHT = 4800;

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

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

    // Optional: Scroll to the center of the map on initial load
    const scrollableArea = document.querySelector('.explore-page'); 
    if (scrollableArea) {
        // Ensure clientHeight/Width are available (component is mounted and rendered)
        if (scrollableArea.clientHeight > 0 && scrollableArea.clientWidth > 0) {
            scrollableArea.scrollTop = (WORLD_PIXEL_HEIGHT - scrollableArea.clientHeight) / 2;
            scrollableArea.scrollLeft = (WORLD_PIXEL_WIDTH - scrollableArea.clientWidth) / 2;
        }
    }

    return () => {
        isMounted = false; 
    };
  }, []); 

  if (isLoading) {
    return <div className="explore-status-message explore-loading">Loading Map Data...</div>;
  }

  if (error) {
    return <div className="explore-status-message explore-error">Error loading map: {error}</div>;
  }
  
  return (
    <div className="explore-page"> 
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
