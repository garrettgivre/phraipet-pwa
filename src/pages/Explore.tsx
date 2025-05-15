// src/pages/Explore.tsx (New Remake)
// MODIFIED: Removed 'React' from import as it's not explicitly used.
import { useEffect, useState, useRef } from 'react';
import MapCanvas from '../components/MapCanvas'; // Assuming MapCanvas is stable
import type { AppHotspot, TiledMapData, TiledObject } from '../types';
import './Explore.css'; // We will use the new Explore.css below

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
  const scrollableMapAreaRef = useRef<HTMLDivElement>(null); // Ref for the main scrollable area

  const mapTileBackgroundImageUrl = "/maps/world_map_background.png"; // Path to your map background

  // Effect to fetch hotspot data from your Tiled JSON
  useEffect(() => {
    let isMounted = true;
    const fetchMapData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setHotspots([]);

      try {
        const response = await fetch('/maps/world_map_data.json'); // Path to your Tiled JSON
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");

        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map(obj => ({
            id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
            name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Hotspot',
            x: obj.x + (obj.width / 2), // Center of the hotspot
            y: obj.y + (obj.height / 2), // Center of the hotspot
            route: getTiledObjectProperty(obj, 'route') || '/', // Default route if not specified
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
    if (!isLoading && !error && scrollableMapAreaRef.current) {
      const scrollableArea = scrollableMapAreaRef.current;
      // Ensure dimensions are positive before calculating scroll
      if (scrollableArea.clientHeight > 0 && scrollableArea.clientWidth > 0 && WORLD_MAP_PIXEL_HEIGHT > 0 && WORLD_MAP_PIXEL_WIDTH > 0) {
        const scrollTop = (WORLD_MAP_PIXEL_HEIGHT - scrollableArea.clientHeight) / 2;
        const scrollLeft = (WORLD_MAP_PIXEL_WIDTH - scrollableArea.clientWidth) / 2;

        scrollableArea.scrollTop = scrollTop > 0 ? scrollTop : 0;
        scrollableArea.scrollLeft = scrollLeft > 0 ? scrollLeft : 0;
      }
    }
  }, [isLoading, error]); // Re-run if loading/error state changes

  // Conditional rendering for loading and error states
  if (isLoading) {
    return <div className="explore-page-status-message loading">Loading Map Data...</div>;
  }
  if (error) {
    return <div className="explore-page-status-message error-message">Error loading map: {error}</div>;
  }

  // Main render for the Explore page
  return (
    // This is the main scrollable container for the Explore page content
    <div ref={scrollableMapAreaRef} className="explore-page-scroll-wrapper">
      {/* This div represents the full, large map area (background + canvas) */}
      <div
        className="explore-map-content-container"
        style={{
          width: `${WORLD_MAP_PIXEL_WIDTH}px`,
          height: `${WORLD_MAP_PIXEL_HEIGHT}px`,
          backgroundImage: `url(${mapTileBackgroundImageUrl})`,
        }}
      >
        {/* The MapCanvas is overlaid on the map-content-container */}
        <MapCanvas
          hotspots={hotspots}
          canvasWidth={WORLD_MAP_PIXEL_WIDTH}
          canvasHeight={WORLD_MAP_PIXEL_HEIGHT}
        />
      </div>
    </div>
  );
}
