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

// Original large world dimensions (keep for reference or easy revert)
// const WORLD_PIXEL_WIDTH = 7200;
// const WORLD_PIXEL_HEIGHT = 4800;

// --- TEST: Use small, fixed dimensions for the canvas and its container ---
const TEST_CANVAS_WIDTH = 300;
const TEST_CANVAS_HEIGHT = 300;
// --- END TEST ---

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const explorePageRef = useRef<HTMLDivElement>(null);

  const mapTileImageUrl = "/maps/world_map_background.png"; // This will be tiled or cut off for the small test canvas

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
          // For the test, we might want to filter hotspots to only those within TEST_CANVAS_WIDTH/HEIGHT
          // or adjust their coordinates if they are based on the large world.
          // For now, we'll pass all, but they might appear off-canvas.
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
  }, []);

  // Scroll to center logic - this might not make sense for the small test canvas,
  // but we'll leave it for now. It will likely scroll to 0,0.
  useEffect(() => {
    if (!isLoading && !error && explorePageRef.current) {
      const scrollableArea = explorePageRef.current;
      if (scrollableArea.clientHeight > 0 && scrollableArea.clientWidth > 0 && TEST_CANVAS_HEIGHT > 0 && TEST_CANVAS_WIDTH > 0) {
        const scrollTop = (TEST_CANVAS_HEIGHT - scrollableArea.clientHeight) / 2;
        const scrollLeft = (TEST_CANVAS_WIDTH - scrollableArea.clientWidth) / 2;
        scrollableArea.scrollTop = scrollTop > 0 ? scrollTop : 0;
        scrollableArea.scrollLeft = scrollLeft > 0 ? scrollLeft : 0;
      }
    }
  }, [isLoading, error]);

  if (isLoading) {
    return <div className="explore-status-message explore-loading">Loading Map Data...</div>;
  }
  if (error) {
    return <div className="explore-status-message explore-error">Error loading map: {error}</div>;
  }

  return (
    <div ref={explorePageRef} className="explore-page">
      {/*
        The .map-scrollable-content div will now also be sized to the test dimensions
        to ensure it visually contains the smaller canvas for this test.
        Its background image will likely be cut off or tiled differently.
      */}
      <div
        className="map-scrollable-content"
        style={{
          width: `${TEST_CANVAS_WIDTH}px`,   // TEST
          height: `${TEST_CANVAS_HEIGHT}px`, // TEST
          backgroundImage: `url(${mapTileImageUrl})`,
          // Ensure other styles like background-repeat are appropriate for a small view if needed
        }}
      >
        <MapCanvas
          hotspots={hotspots}
          canvasWidth={TEST_CANVAS_WIDTH}    // TEST
          canvasHeight={TEST_CANVAS_HEIGHT}  // TEST
        />
      </div>
    </div>
  );
}
