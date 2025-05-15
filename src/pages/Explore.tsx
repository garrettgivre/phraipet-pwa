// src/pages/Explore.tsx (Revised for Robust Layout)
import { useEffect, useState, useRef } from 'react';
import MapCanvas from '../components/MapCanvas';
import type { AppHotspot, TiledMapData, TiledObject } from '../types';
import './Explore.css'; // This will use the CSS provided in the next block

// Helper function to get properties from Tiled objects
const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) {
    return undefined;
  }
  const property = object.properties.find(p => p.name === propertyName);
  return property?.value;
};

// Define the large dimensions for your scrollable world map
const WORLD_MAP_PIXEL_WIDTH = 7200;
const WORLD_MAP_PIXEL_HEIGHT = 4800;

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollablePageRef = useRef<HTMLDivElement>(null);

  const mapTileBackgroundImageUrl = "/maps/world_map_background.png";

  // Effect to fetch hotspot data
  useEffect(() => {
    let isMounted = true;
    const fetchMapData = async () => {
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

    fetchMapData();
    return () => { isMounted = false; };
  }, []);

  // Effect to scroll the map to its center
  useEffect(() => {
    if (!isLoading && !error && scrollablePageRef.current) {
      const scrollableArea = scrollablePageRef.current;
      if (scrollableArea.clientHeight > 0 && scrollableArea.clientWidth > 0 && WORLD_MAP_PIXEL_HEIGHT > 0 && WORLD_MAP_PIXEL_WIDTH > 0) {
        const scrollTop = (WORLD_MAP_PIXEL_HEIGHT - scrollableArea.clientHeight) / 2;
        const scrollLeft = (WORLD_MAP_PIXEL_WIDTH - scrollableArea.clientWidth) / 2;
        scrollableArea.scrollTop = scrollTop > 0 ? scrollTop : 0;
        scrollableArea.scrollLeft = scrollLeft > 0 ? scrollLeft : 0;
      }
    }
  }, [isLoading, error]);

  // Conditional rendering for loading and error states
  if (isLoading) {
    return <div className="explore-status-message explore-loading-state">Loading Map Data...</div>;
  }
  if (error) {
    return <div className="explore-status-message explore-error-state">Error loading map: {error}</div>;
  }

  // Main render for the Explore page
  return (
    <div ref={scrollablePageRef} className="explore-page-scroll-wrapper">
      <div
        className="explore-map-content-holder"
        style={{
          width: `${WORLD_MAP_PIXEL_WIDTH}px`,
          height: `${WORLD_MAP_PIXEL_HEIGHT}px`,
          backgroundImage: `url(${mapTileBackgroundImageUrl})`,
          // position: 'relative' is handled by the CSS class
        }}
      >
        <MapCanvas
          hotspots={hotspots}
          canvasWidth={WORLD_MAP_PIXEL_WIDTH}
          canvasHeight={WORLD_MAP_PIXEL_HEIGHT}
        />
      </div>
    </div>
  );
}
