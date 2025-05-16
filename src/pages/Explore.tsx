// src/pages/Explore.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
const GRID_SIZE = 3; // We only need 3x3 for infinite scrolling
const TILED_MAP_WIDTH = 1600; // Original Tiled map width
const TILED_MAP_HEIGHT = 1200; // Original Tiled map height

export default function Explore() {
  const location = useLocation();
  const isExploreRoot = location.pathname === "/explore";
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);

  // Calculate map dimensions based on viewport height
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateMapDimensions = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate dimensions to ensure map fills viewport without duplicates
      const mapHeight = viewportHeight * 1.2; // 120% of viewport height
      const mapWidth = mapHeight * MAP_ASPECT_RATIO;
      
      // If map is too wide for viewport, scale it down
      if (mapWidth < viewportWidth * 1.2) {
        const scaledWidth = viewportWidth * 1.2;
        const scaledHeight = scaledWidth / MAP_ASPECT_RATIO;
        setMapDimensions({ width: scaledWidth, height: scaledHeight });
      } else {
        setMapDimensions({ width: mapWidth, height: mapHeight });
      }
    };

    updateMapDimensions();
    window.addEventListener('resize', updateMapDimensions);
    return () => window.removeEventListener('resize', updateMapDimensions);
  }, []);

  // Handle infinite scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mapDimensions.width || !mapDimensions.height) return;

    let isScrolling = false;
    const mapWidth = mapDimensions.width;
    const mapHeight = mapDimensions.height;

    const handleScroll = () => {
      if (isScrolling) return;
      isScrolling = true;

      const { scrollLeft, scrollTop } = container;
      let newScrollLeft = scrollLeft;
      let newScrollTop = scrollTop;

      // Handle horizontal wrapping
      if (scrollLeft < mapWidth) {
        newScrollLeft = scrollLeft + mapWidth;
      } else if (scrollLeft > mapWidth * 2) {
        newScrollLeft = scrollLeft - mapWidth;
      }

      // Handle vertical wrapping
      if (scrollTop < mapHeight) {
        newScrollTop = scrollTop + mapHeight;
      } else if (scrollTop > mapHeight * 2) {
        newScrollTop = scrollTop - mapHeight;
      }

      // Apply new scroll position if it changed
      if (newScrollLeft !== scrollLeft || newScrollTop !== scrollTop) {
        container.scrollTo({
          left: newScrollLeft,
          top: newScrollTop,
          behavior: 'auto'
        });
      }

      isScrolling = false;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [mapDimensions]);

  // Set initial scroll position to center
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mapDimensions.width || !mapDimensions.height) return;

    // Only set initial position if we're at the default scroll position
    if (container.scrollLeft === 0 && container.scrollTop === 0) {
      requestAnimationFrame(() => {
        container.scrollTo({
          left: mapDimensions.width,
          top: mapDimensions.height,
          behavior: 'auto'
        });
      });
    }
  }, [mapDimensions]);

  // Effect to fetch and process Tiled map data for hotspots
  useEffect(() => {
    let isMounted = true;
    const fetchMapData = async () => {
      if (!isMounted) return;

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

            // Scale coordinates based on current map dimensions
            const scaleX = mapDimensions.width / TILED_MAP_WIDTH;
            const scaleY = mapDimensions.height / TILED_MAP_HEIGHT;
            const scaledX = centerX * scaleX;
            const scaledY = centerY * scaleY;
            const scaledRadius = clickRadius * Math.min(scaleX, scaleY);

            return {
              id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
              name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Hotspot',
              x: scaledX,
              y: scaledY,
              radius: scaledRadius,
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
          setHotspots([]);
        }
      }
    };

    fetchMapData();
    return () => { isMounted = false; };
  }, [mapDimensions]);

  if (!isExploreRoot) {
    return <Outlet />;
  }

  return (
    <div className="explore-page">
      <div 
        ref={containerRef}
        className="map-container"
        style={{
          width: '100%',
          height: '100vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <div 
          className="map-grid"
          style={{
            width: mapDimensions.width * GRID_SIZE,
            height: mapDimensions.height * GRID_SIZE,
            position: 'relative'
          }}
        >
          {/* Render map tiles */}
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const row = Math.floor(index / GRID_SIZE);
            const col = index % GRID_SIZE;
            return (
              <div
                key={index}
                className="map-tile"
                style={{
                  position: 'absolute',
                  left: Math.round(col * mapDimensions.width),
                  top: Math.round(row * mapDimensions.height),
                  width: Math.round(mapDimensions.width),
                  height: Math.round(mapDimensions.height),
                  backgroundImage: `url(${MAP_BACKGROUND_IMAGE_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            );
          })}
          
          {/* Render hotspots canvas */}
          <MapCanvas
            hotspots={hotspots}
            canvasWidth={mapDimensions.width * GRID_SIZE}
            canvasHeight={mapDimensions.height * GRID_SIZE}
            onHotspotClick={(hotspot) => navigate(hotspot.route)}
            mapWidth={mapDimensions.width}
            mapHeight={mapDimensions.height}
            gridSize={GRID_SIZE}
          />
        </div>
      </div>
    </div>
  );
}