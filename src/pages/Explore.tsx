// src/pages/Explore.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MapCanvas from '../components/MapCanvas';
import type { AppHotspot, TiledMapData, TiledObject } from '../types';
import './Explore.css';

// Helper function to get properties from Tiled objects
const getTiledObjectProperty = <T extends string | number | boolean = string>(
  object: TiledObject,
  propertyName: string,
): T | undefined => {
  const props = object.properties;
  if (!props) return undefined;
  const property = props.find(
    (prop) => prop.name.toLowerCase() === propertyName.toLowerCase()
  );
  return property?.value as T | undefined;
};

// Configuration for the world map
const MAP_BACKGROUND_IMAGE_URL = "/maps/world_map_background.png";
const TILED_MAP_DATA_URL = '/maps/world_map_data.json';
const MAP_ASPECT_RATIO = 5800 / 2800; // Width to height ratio of the map
const GRID_SIZE = 3; // We only need 3x3 for infinite scrolling
const TILED_MAP_WIDTH = 5800; // Original Tiled map width - updated to match your actual map
const TILED_MAP_HEIGHT = 2800; // Original Tiled map height - updated to match your actual map

// Red dot icon base64 (simple SVG)
const RED_DOT_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0icmVkIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=";

interface GridLocation {
  name: string;
  grid: string; // e.g. "E4"
  route?: string;
}

const STATIC_LOCATIONS: GridLocation[] = [
  { name: "Crystal", grid: "E4", route: "/explore/crystal" },
  { name: "Magic Forest", grid: "G5", route: "/explore/magic-forest" },
  { name: "Flowers", grid: "O4", route: "/explore/flowers" },
  { name: "Sunnybrook", grid: "M2", route: "/sunnybrook" },
  { name: "Danger Shore", grid: "P2", route: "/explore/danger-shore" },
  // Whirlpool Cluster
  { name: "Whirlpool", grid: "V3", route: "/explore/whirlpool" },
  { name: "Whirlpool", grid: "V4", route: "/explore/whirlpool" },
  { name: "Whirlpool", grid: "U3", route: "/explore/whirlpool" },
  { name: "Whirlpool", grid: "U4", route: "/explore/whirlpool" },
  { name: "Whirlpool", grid: "W3", route: "/explore/whirlpool" },
  { name: "Whirlpool", grid: "W4", route: "/explore/whirlpool" },
  
  { name: "Terror Point", grid: "G14", route: "/explore/terror-point" },
  { name: "Icy Point", grid: "D14", route: "/explore/icy-point" },
  { name: "Snowy Point", grid: "C15", route: "/explore/snowy-point" },
  { name: "Scorched Forest", grid: "N17", route: "/explore/scorched-forest" },
  { name: "Cybttopolis", grid: "S16", route: "/explore/cybttopolis" },
  { name: "Tiny Island", grid: "V18", route: "/explore/tiny-island" },
  { name: "The Island", grid: "T19", route: "/explore/the-island" },
  { name: "The Island", grid: "U19", route: "/explore/the-island" },
  { name: "Fragment Island", grid: "K19", route: "/explore/fragment-island" },
  { name: "The Fall", grid: "J20", route: "/explore/the-fall" },
  { name: "Snowy Island", grid: "D17", route: "/explore/snowy-island" },
  { name: "Red Cliffs", grid: "E9", route: "/explore/red-cliffs" },
  { name: "Emerald Mines", grid: "N9", route: "/explore/emerald-mines" },
  { name: "Emerald Forest", grid: "M11", route: "/explore/emerald-forest" },
  { name: "The Depths", grid: "X10", route: "/explore/the-depths" },
  { name: "Snowfall Forest", grid: "H16", route: "/explore/snowfall-forest" },
];

export default function Explore() {
  const location = useLocation();
  const isExploreRoot = location.pathname === "/explore";
  const isSunnybrookRoot = location.pathname === "/sunnybrook";
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [showBuildingAreas, setShowBuildingAreas] = useState(false);
  
  const [showGrid, setShowGrid] = useState(() => {
    const saved = localStorage.getItem('show_map_grid');
    return saved === 'true';
  });

  const [zoomLevel, setZoomLevel] = useState(1);

  // Listen for grid toggle event from Settings
  useEffect(() => {
    const handleGridToggle = () => {
      const saved = localStorage.getItem('show_map_grid');
      setShowGrid(saved === 'true');
    };
    
    window.addEventListener('storage', handleGridToggle);
    // Custom event for same-window updates
    window.addEventListener('map-grid-toggle', handleGridToggle);
    
    return () => {
      window.removeEventListener('storage', handleGridToggle);
      window.removeEventListener('map-grid-toggle', handleGridToggle);
    };
  }, []);
  const minZoomRef = useRef(1);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  // Calculate map dimensions based on viewport height and zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateMapDimensions = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate base dimensions (zoom = 1)
      // Constraint: mapHeight >= viewportHeight
      const baseMapHeight = viewportHeight;
      const baseMapWidth = baseMapHeight * MAP_ASPECT_RATIO;
      
      // If width is smaller than viewport at min height, we might need to scale up?
      // User said: "The furthest I should be able to zoom out is where the map fills the screen vertically."
      // This implies base state is vertically filling.
      
      minZoomRef.current = 1;
      
      const currentMapHeight = baseMapHeight * zoomLevel;
      const currentMapWidth = baseMapWidth * zoomLevel;
      
      setMapDimensions({ width: currentMapWidth, height: currentMapHeight });
    };

    updateMapDimensions();
    window.addEventListener('resize', updateMapDimensions);
    return () => window.removeEventListener('resize', updateMapDimensions);
  }, [zoomLevel]);

  // Handle Pinch Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchDistanceRef.current = dist;
        initialZoomRef.current = zoomLevel;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
        e.preventDefault(); // Prevent page zoom
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        // Calculate center point of the pinch (relative to viewport)
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        // Calculate current scroll position + center point offset
        // This gives us the "world coordinate" we are zooming on
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;
        const worldX = scrollLeft + centerX;
        const worldY = scrollTop + centerY;
        
        const dist = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        const ratio = dist / initialPinchDistanceRef.current;
        let newZoom = initialZoomRef.current * ratio;
        
        // Constraints
        newZoom = Math.max(1, Math.min(newZoom, 3));
        
        if (newZoom !== zoomLevel) {
          // Calculate scaling factor relative to current zoom
          const scaleFactor = newZoom / zoomLevel;
          
          setZoomLevel(newZoom);
          
          // Adjust scroll position to keep the pinch center stable
          // New World Coordinate = Old World Coordinate * ScaleFactor
          // New Scroll Position = New World Coordinate - Viewport Center Offset
          requestAnimationFrame(() => {
            const newScrollLeft = (worldX * scaleFactor) - centerX;
            const newScrollTop = (worldY * scaleFactor) - centerY;
            container.scrollTo({ left: newScrollLeft, top: newScrollTop, behavior: 'auto' });
          });
        }
      }
    };

    const handleTouchEnd = () => {
      initialPinchDistanceRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoomLevel]);

  // Handle infinite scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mapDimensions.width || !mapDimensions.height) return;

    let isScrolling = false;
    // Use Math.floor to ensure we compare integer values consistent with rendering
    const mapWidth = Math.floor(mapDimensions.width);
    const mapHeight = Math.floor(mapDimensions.height);

    const handleScroll = () => {
      if (isScrolling) return;
      isScrolling = true;

      const { scrollLeft, scrollTop } = container;
      let newScrollLeft = scrollLeft;
      let newScrollTop = scrollTop;
      
      // Adjust scroll thresholds to prevent seeing edges
      // Buffer can be small, just need to detect wrap
      
      // Horizontal Wrap
      if (scrollLeft < mapWidth * 0.5) {
        newScrollLeft = scrollLeft + mapWidth;
      } else if (scrollLeft > mapWidth * 1.5) {
        newScrollLeft = scrollLeft - mapWidth;
      }

      // Vertical Wrap
      // If we scroll up past the first tile (top < 0.5 height), wrap to bottom
      if (scrollTop < mapHeight * 0.5) {
        newScrollTop = scrollTop + mapHeight;
      } else if (scrollTop > mapHeight * 1.5) {
        newScrollTop = scrollTop - mapHeight;
      }

      if (Math.abs(newScrollLeft - scrollLeft) > 1 || Math.abs(newScrollTop - scrollTop) > 1) {
        container.scrollTo({ left: newScrollLeft, top: newScrollTop, behavior: 'auto' });
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
    if (container.scrollLeft === 0 && container.scrollTop === 0) {
      requestAnimationFrame(() => {
        container.scrollTo({ left: mapDimensions.width, top: mapDimensions.height, behavior: 'auto' });
      });
    }
  }, [mapDimensions]);

  // Effect to fetch and process Tiled map data for hotspots
  useEffect(() => {
    let isMounted = true;
    let mapDataUrl = TILED_MAP_DATA_URL;
    if (isSunnybrookRoot) mapDataUrl = '/maps/sunnybrook_map_data.json';

    const fetchMapData = async () => {
      if (!isMounted) return;
      try {
        const response = await fetch(mapDataUrl);
        if (!response.ok) throw new Error(`Failed to fetch map data from ${mapDataUrl}: ${response.statusText} (status: ${response.status})`);
        const tiledMapData = (await response.json()) as TiledMapData;
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");
        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map((obj: TiledObject) => {
            const centerX = obj.x + (obj.width / 2);
            const centerY = obj.y + (obj.height / 2);
            const nameProperty = getTiledObjectProperty<string>(obj, 'Name') || getTiledObjectProperty<string>(obj, 'name');
            const idString = getTiledObjectProperty<string>(obj, 'id_string');
            const route = getTiledObjectProperty<string>(obj, 'route');
            const iconSrc = getTiledObjectProperty<string>(obj, 'iconSrc');
            const iconSizeStr = getTiledObjectProperty<string>(obj, 'iconSize');
            const radiusStr = getTiledObjectProperty<string>(obj, 'radius');
            const type = (getTiledObjectProperty<string>(obj, 'type') || 'location') as 'location' | 'building';
            const iconSize = iconSizeStr ? parseInt(iconSizeStr, 10) : undefined;
            const clickRadius = radiusStr ? parseInt(radiusStr, 10) : Math.max(obj.width, obj.height) / 1.5;
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
              type,
            };
          });
          
          // Merge fetched hotspots with static red dot locations
          // Only for the main map, not Sunnybrook
          if (!isSunnybrookRoot) {
            const ROW_HEIGHT = TILED_MAP_HEIGHT / 26;
            const COL_WIDTH = TILED_MAP_WIDTH / 20;
            const scaleX = mapDimensions.width / TILED_MAP_WIDTH;
            const scaleY = mapDimensions.height / TILED_MAP_HEIGHT;

            STATIC_LOCATIONS.forEach(loc => {
              // Parse grid string "E4" -> Row E, Col 4
              const rowChar = loc.grid.charAt(0).toUpperCase();
              const colNumStr = loc.grid.slice(1);
              
              const rowIndex = rowChar.charCodeAt(0) - 65; // A=0, B=1...
              const colIndex = parseInt(colNumStr, 10) - 1; // 1=0, 2=1...
              
              if (rowIndex >= 0 && rowIndex < 26 && colIndex >= 0 && colIndex < 20) {
                // Calculate center of grid cell in base map coordinates
                const baseX = (colIndex * COL_WIDTH) + (COL_WIDTH / 2);
                const baseY = (rowIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
                
                // Scale to current viewport
                const scaledX = baseX * scaleX;
                const scaledY = baseY * scaleY;
                
                // Add to list
                processedHotspots.push({
                  id: `static-${loc.name}-${loc.grid}`,
                  name: loc.name,
                  x: scaledX,
                  y: scaledY,
                  radius: 30, // Click radius
                  route: loc.route,
                  iconSrc: RED_DOT_ICON,
                  iconSize: 24, // Red dot size
                  type: 'location'
                });
              }
            });
          }

          if (isMounted) setHotspots(processedHotspots);
        } else {
          console.warn(`Explore: Could not find 'Hotspots' object layer in Tiled map data at ${mapDataUrl}.`);
          if (isMounted) setHotspots([]);
        }
      } catch (err) {
        console.error("Explore: Error loading or processing Tiled JSON data:", err);
        if (isMounted) setHotspots([]);
      }
    };

    void fetchMapData();
    return () => { isMounted = false; };
  }, [mapDimensions, isSunnybrookRoot]);

  if (!isExploreRoot && !isSunnybrookRoot) {
    return <Outlet />;
  }

  const handleHotspotClick = (hotspot: AppHotspot) => {
    try {
      if (hotspot.name === "Sunnybrook" || (hotspot.route && hotspot.route.includes('sunnybrook'))) {
        console.log("Navigating to Sunnybrook...");
        void navigate('/sunnybrook');
        window.setTimeout(() => {
          if (window.location.pathname !== '/sunnybrook') {
            console.log("Fallback to direct navigation to Sunnybrook");
            window.location.href = '/sunnybrook';
          }
        }, 100);
        return;
      }
      void navigate(hotspot.route);
    } catch (err) {
      console.error("Navigation error:", err);
      window.location.href = hotspot.route;
    }
  };

  const handleDoubleClick = () => { 
    setShowBuildingAreas(!showBuildingAreas); 
    // setShowGrid(!showGrid); // Disabled toggle, grid always on
  };

  return (
    <div className="explore-page">
      <div 
        ref={containerRef}
        className="map-container"
        style={{ width: '100%', height: '100vh', overflow: 'auto', position: 'relative', backgroundColor: '#f2ead3' }}
        onDoubleClick={handleDoubleClick}
      >
        <div 
          className="map-grid"
          style={{ width: mapDimensions.width * GRID_SIZE, height: mapDimensions.height * GRID_SIZE, position: 'relative', transform: 'translateZ(0)', backfaceVisibility: 'hidden', willChange: 'transform' }}
        >
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
                  backgroundSize: '100% 100%',
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
          <MapCanvas
            hotspots={hotspots}
            canvasWidth={mapDimensions.width * GRID_SIZE}
            canvasHeight={mapDimensions.height * GRID_SIZE}
            onHotspotClick={handleHotspotClick}
            mapWidth={mapDimensions.width}
            mapHeight={mapDimensions.height}
            gridSize={GRID_SIZE}
            showBuildingAreas={showBuildingAreas}
            showGrid={showGrid}
          />
        </div>
      </div>
    </div>
  );
}