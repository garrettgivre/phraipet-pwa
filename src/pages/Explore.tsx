// src/pages/Explore.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MapCanvas from '../components/MapCanvas';
import type { AppHotspot, TiledMapData, TiledObject } from '../types';
import './Explore.css';

// Helper function to get properties from Tiled objects
const getTiledObjectProperty = (object: TiledObject, propertyName: string): string | undefined => {
  if (!object.properties) return undefined;
  
  // Case-insensitive property name search to be more forgiving
  const property = object.properties.find(
    prop => prop.name.toLowerCase() === propertyName.toLowerCase()
  );
  
  return property?.value?.toString();
};

// Configuration for the world map
const MAP_BACKGROUND_IMAGE_URL = "/maps/world_map_background.png";
const TILED_MAP_DATA_URL = '/maps/world_map_data.json';
const MAP_ASPECT_RATIO = 1.5; // Width to height ratio of the map
const GRID_SIZE = 3; // We only need 3x3 for infinite scrolling
const TILED_MAP_WIDTH = 1536; // Original Tiled map width - updated to match your actual map
const TILED_MAP_HEIGHT = 1024; // Original Tiled map height - updated to match your actual map

export default function Explore() {
  const location = useLocation();
  const isExploreRoot = location.pathname === "/explore";
  const isSunnybrookRoot = location.pathname === "/sunnybrook";
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [showBuildingAreas, setShowBuildingAreas] = useState(false);

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
    
    // Determine which map data to load based on current route
    let mapDataUrl = TILED_MAP_DATA_URL;
    if (isSunnybrookRoot) {
      mapDataUrl = '/maps/sunnybrook_map_data.json';
    }
    
    const fetchMapData = async () => {
      if (!isMounted) return;

      try {
        const response = await fetch(mapDataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch map data from ${mapDataUrl}: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");

        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map((obj: TiledObject) => {
            // Get the center point of the object
            const centerX = obj.x + (obj.width / 2);
            const centerY = obj.y + (obj.height / 2);
            
            // Get properties with case-insensitive lookups
            const nameProperty = getTiledObjectProperty(obj, 'Name') || getTiledObjectProperty(obj, 'name');
            const idString = getTiledObjectProperty(obj, 'id_string');
            const route = getTiledObjectProperty(obj, 'route');
            const iconSrc = getTiledObjectProperty(obj, 'iconSrc');
            const iconSizeStr = getTiledObjectProperty(obj, 'iconSize');
            const radiusStr = getTiledObjectProperty(obj, 'radius');
            const type = getTiledObjectProperty(obj, 'type') || 'location'; // Default to location
            
            // Parse numeric values
            const iconSize = iconSizeStr ? parseInt(iconSizeStr, 10) : undefined;
            const clickRadius = radiusStr ? parseInt(radiusStr, 10) : Math.max(obj.width, obj.height) / 1.5;

            // Scale coordinates based on current map dimensions
            const scaleX = mapDimensions.width / TILED_MAP_WIDTH;
            const scaleY = mapDimensions.height / TILED_MAP_HEIGHT;
            const scaledX = centerX * scaleX;
            const scaledY = centerY * scaleY;
            const scaledRadius = clickRadius * Math.min(scaleX, scaleY);

            return {
              id: idString || `tiled-obj-${obj.id}`,
              name: nameProperty || obj.name || 'Unnamed Hotspot',
              x: scaledX,
              y: scaledY,
              radius: scaledRadius,
              route: route || '/',
              iconSrc: iconSrc,
              iconSize: iconSize ? Math.round(iconSize * Math.min(scaleX, scaleY)) : undefined,
              type: type as 'location' | 'building'
            };
          });
          
          if (isMounted) setHotspots(processedHotspots);
        } else {
          console.warn(`Explore: Could not find 'Hotspots' object layer in Tiled map data at ${mapDataUrl}.`);
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
  }, [mapDimensions, isSunnybrookRoot]);

  if (!isExploreRoot && !isSunnybrookRoot) {
    return <Outlet />;
  }

  const handleHotspotClick = (hotspot: AppHotspot) => {
    // Simple direct navigation with fallbacks
    try {
      // For Sunnybrook specifically
      if (hotspot.name === "Sunnybrook" || 
          (hotspot.route && hotspot.route.includes('sunnybrook'))) {
        console.log("Navigating to Sunnybrook...");
        // Try React Router first
        navigate('/sunnybrook');
        
        // Fallback to direct navigation after a short delay if needed
        setTimeout(() => {
          if (window.location.pathname !== '/sunnybrook') {
            console.log("Fallback to direct navigation to Sunnybrook");
            window.location.href = '/sunnybrook';
          }
        }, 100);
        return;
      }
      
      // For other locations
      navigate(hotspot.route);
    } catch (err) {
      console.error("Navigation error:", err);
      // Ultimate fallback - direct navigation
      window.location.href = hotspot.route;
    }
  };

  // Toggle debug mode (double click/tap on map)
  const handleDoubleClick = () => {
    setShowBuildingAreas(!showBuildingAreas);
  };

  return (
    <div className="explore-page">
      <div 
        ref={containerRef}
        className="map-container"
        style={{
          width: '100%',
          height: '100vh',
          overflow: 'auto',
          position: 'relative',
          backgroundColor: '#f2ead3' // Match the background color
        }}
        onDoubleClick={handleDoubleClick}
      >
        <div 
          className="map-grid"
          style={{
            width: mapDimensions.width * GRID_SIZE,
            height: mapDimensions.height * GRID_SIZE,
            position: 'relative',
            transform: 'translateZ(0)', // Force GPU acceleration
            backfaceVisibility: 'hidden',
            willChange: 'transform'
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
                  left: Math.floor(col * mapDimensions.width),
                  top: Math.floor(row * mapDimensions.height),
                  width: Math.ceil(mapDimensions.width),
                  height: Math.ceil(mapDimensions.height),
                  backgroundImage: `url(${isSunnybrookRoot ? '/maps/sunnybrook_map_background.png' : MAP_BACKGROUND_IMAGE_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  imageRendering: 'pixelated',
                  backgroundRepeat: 'no-repeat',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'border-box',
                  boxSizing: 'border-box'
                }}
              />
            );
          })}
          
          {/* Render hotspots canvas */}
          <MapCanvas
            hotspots={hotspots}
            canvasWidth={mapDimensions.width * GRID_SIZE}
            canvasHeight={mapDimensions.height * GRID_SIZE}
            onHotspotClick={handleHotspotClick}
            mapWidth={mapDimensions.width}
            mapHeight={mapDimensions.height}
            gridSize={GRID_SIZE}
            showBuildingAreas={showBuildingAreas}
          />
        </div>
      </div>
    </div>
  );
}