// src/pages/Explore.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapCanvas from '../components/MapCanvas';
import type { AppHotspot, TiledMapData, TiledObject, TiledProperty } from '../types';
import './Explore.css';

// Helper function to get properties from Tiled objects
const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) {
    return undefined;
  }
  const property: TiledProperty | undefined = object.properties.find(p => p.name === propertyName);
  return property?.value;
};

// Configuration for the world map
const MAP_BACKGROUND_IMAGE_URL = "/maps/world_map_background.png";
const TILED_MAP_DATA_URL = '/maps/world_map_data.json';
const MAP_ASPECT_RATIO = 1.5; // Width to height ratio of the map

function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState(getViewportSize());
  const navigate = useNavigate();

  // Calculate map dimensions based on viewport height
  const mapHeight = viewport.height;
  const mapWidth = mapHeight * MAP_ASPECT_RATIO;

  useEffect(() => {
    const handleResize = () => setViewport(getViewportSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to fetch and process Tiled map data for hotspots
  useEffect(() => {
    let isMounted = true;
    const fetchMapData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setHotspots([]);

      try {
        const response = await fetch(TILED_MAP_DATA_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch map data from ${TILED_MAP_DATA_URL}: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");

        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map((obj: TiledObject) => {
            const centerX = obj.x + (obj.width / 2);
            const centerY = obj.y + (obj.height / 2);
            const tiledRadius = getTiledObjectProperty(obj, 'radius');
            const clickRadius = typeof tiledRadius === 'number' ? tiledRadius : Math.max(obj.width, obj.height) / 1.5 || 20;

            return {
              id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
              name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Hotspot',
              x: centerX,
              y: centerY,
              radius: clickRadius,
              route: getTiledObjectProperty(obj, 'route') || '/',
              iconSrc: getTiledObjectProperty(obj, 'iconSrc') || undefined,
              iconSize: getTiledObjectProperty(obj, 'iconSize') || undefined,
            };
          });
          if (isMounted) setHotspots(processedHotspots);
        } else {
          console.warn(`Explore: Could not find 'Hotspots' object layer in Tiled map data at ${TILED_MAP_DATA_URL}.`);
          if (isMounted) setHotspots([]);
        }
      } catch (err) {
        console.error("Explore: Error loading or processing Tiled JSON data:", err);
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

  const handleHotspotNavigate = (hotspot: AppHotspot) => {
    if (hotspot.route) navigate(hotspot.route);
  };

  if (isLoading) {
    return (
      <div className="explore-page-container">
        <div className="explore-status-message explore-loading-state">Loading Map Data...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="explore-page-container">
        <div className="explore-status-message explore-error-state">
          Error loading map: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="explore-page-container">
      <div
        className="explore-map-content-wrapper"
        style={{
          width: mapWidth,
          height: mapHeight,
          backgroundImage: `url(${MAP_BACKGROUND_IMAGE_URL})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
        }}
      >
        <MapCanvas
          hotspots={hotspots}
          canvasWidth={mapWidth}
          canvasHeight={mapHeight}
          onHotspotClick={handleHotspotNavigate}
        />
      </div>
    </div>
  );
}