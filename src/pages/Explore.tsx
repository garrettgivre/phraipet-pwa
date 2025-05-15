// src/pages/Explore.tsx (Rebuilt with Map)
import { useEffect, useState, useRef } from 'react';
import MapCanvas from '../components/MapCanvas';
import type { AppHotspot, TiledMapData, TiledObject } from '../types';
import './Explore.css'; // This will be the CSS from the "Blank Slate" version, which is currently in the Canvas

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
  // This ref points to the main scrollable container for the page
  const scrollablePageRef = useRef<HTMLDivElement>(null);

  const mapTileBackgroundImageUrl = "/maps/world_map_background.png";

  // Effect to fetch hotspot data from your Tiled JSON
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

  // Effect to scroll the map to its center after loading
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

  if (isLoading) {
    // Using class names from the "Blank Slate" CSS for consistency
    return <div className="explore-page-blank-container explore-page-content"><p>Loading Map Data...</p></div>;
  }
  if (error) {
    return <div className="explore-page-blank-container explore-page-content"><p>Error loading map: {error}</p></div>;
  }

  return (
    // This is the main scrollable container, using the class from the working "Blank Slate" CSS
    <div ref={scrollablePageRef} className="explore-page-blank-container">
      {/*
        This div represents the full, large map area.
        It will be larger than its parent and cause scrolling.
        It needs a class for specific map content styling if different from the page wrapper.
        For now, we'll call it 'explore-map-content-holder'.
      */}
      <div
        className="explore-map-content-holder" // New class for the oversized map content
        style={{
          width: `${WORLD_MAP_PIXEL_WIDTH}px`,
          height: `${WORLD_MAP_PIXEL_HEIGHT}px`,
          backgroundImage: `url(${mapTileBackgroundImageUrl})`,
          position: 'relative', // For positioning the MapCanvas
          backgroundRepeat: 'repeat', // Or 'no-repeat' as needed
          backgroundPosition: 'top left',
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
