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
  grids: string[]; // Array of grid coordinates e.g. ["E4", "F4"]
  route?: string;
}

const STATIC_LOCATIONS: GridLocation[] = [
  { name: "Amethyst Spires", grids: ["B4", "C4", "D4", "D5", "E3", "E4", "E5"], route: "/explore/amethyst-spires" },
  { name: "Entrance to The Amethyst Woods", grids: ["F3", "G3"], route: "/explore/amethyst-woods-entrance" },
  { name: "Sunnybrook Village", grids: ["H2", "I1", "I2", "J1", "J2", "K2"], route: "/explore/sunnybrook-village" },
  { name: "Petila Town", grids: ["K3", "L3", "L4", "M3", "M4", "N3", "N4", "O3", "O4", "O5"], route: "/explore/petila-town" },
  { name: "Revivin Coast", grids: ["P2", "P3", "Q3"], route: "/explore/revivin-coast" },
  { name: "The Spiral Gate", grids: ["U3", "U4", "V3", "V4", "W3", "W4"], route: "/explore/spiral-gate" },
  { name: "Sunstep Plateau", grids: ["D9", "E9"], route: "/explore/sunstep-plateau" },
  { name: "The Verdi Stop", grids: ["H9", "I9", "J9"], route: "/explore/verdi-stop" },
  { name: "Essic Town", grids: ["P8", "P9", "Q8", "Q9", "R8"], route: "/explore/essic-town" },
  { name: "Tideglass Depths", grids: ["W9", "W10", "X9", "X10"], route: "/explore/tideglass-depths" },
  { name: "Frostember Peak", grids: ["D14", "E14", "F14", "G15", "F15"], route: "/explore/frostember-peak" },
  { name: "Smolderfume Town", grids: ["J15", "I15", "I16", "J16", "K15"], route: "/explore/smolderfume-town" },
  { name: "Mütlich Peak", grids: ["C15", "C16", "D15", "D16", "E15", "E16"], route: "/explore/mutlich-peak" },
  { name: "Ashenroot Ridge", grids: ["F16", "G16", "G17", "F17"], route: "/explore/ashenroot-ridge" },
  { name: "Revelrid Town", grids: ["L16", "M16", "M17", "L17", "K17", "J17", "K16"], route: "/explore/revelrid-town" },
  { name: "Creykenp City", grids: ["O16", "P16", "P17", "Q15", "Q16", "Q17", "R15", "R16", "R17", "S15", "S16", "S17", "T15", "T16", "T17", "U15", "U16"], route: "/explore/creykenp-city" },
  { name: "Prism Sanctum", grids: ["A17", "A18", "B17", "B18", "B19", "C17", "C18", "C19", "D17", "D18", "D19", "E17", "E18"], route: "/explore/prism-sanctum" },
  { name: "Everfall Perch", grids: ["G19", "G20", "H19", "H20", "I19", "I20", "J19"], route: "/explore/everfall-perch" },
  { name: "Mistblossom Village", grids: ["K19", "K18", "K20", "L19"], route: "/explore/mistblossom-village" },
  { name: "Reqool Island", grids: ["S19", "T19", "T20", "U19", "U20", "V19", "V20", "W19", "W20"], route: "/explore/reqool-island" },
  { name: "Castaway’s Knoll", grids: ["V18"], route: "/explore/castaways-knoll" },
  { name: "Treuse Island", grids: ["J11", "J12", "K11", "K12", "L11", "L12", "M11", "M12", "N11"], route: "/explore/treuse-island" },
];

export default function Explore() {
  const location = useLocation();
  const isExploreRoot = location.pathname === "/explore";
  const isSunnybrookRoot = location.pathname === "/sunnybrook";
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [showBuildingAreas, setShowBuildingAreas] = useState(false);
  
    const [showGrid, setShowGrid] = useState(() => {
    const saved = localStorage.getItem('show_map_grid');
    return saved === 'true';
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const mapGridRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Calculate map dimensions directly from state to ensure sync updates
  const baseMapHeight = windowSize.height;
  const baseMapWidth = baseMapHeight * MAP_ASPECT_RATIO;
  const mapDimensions = {
    width: baseMapWidth * zoomLevel,
    height: baseMapHeight * zoomLevel
  };

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
  const initialPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const initialTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const initialScrollRef = useRef<{ left: number; top: number } | null>(null);

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Pinch Zoom
  useEffect(() => {
    const container = containerRef.current;
    const mapGrid = mapGridRef.current;
    if (!container || !mapGrid) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchDistanceRef.current = dist;
        initialZoomRef.current = zoomLevel;
        
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        initialTouchCenterRef.current = { x: centerX, y: centerY };
        
        const rect = mapGrid.getBoundingClientRect();
        // Calculate pinch center relative to the map grid element
        initialPinchCenterRef.current = {
          x: centerX - rect.left,
          y: centerY - rect.top
        };
        
        initialScrollRef.current = {
          left: container.scrollLeft,
          top: container.scrollTop
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && 
          initialPinchDistanceRef.current !== null && 
          initialPinchCenterRef.current && 
          initialScrollRef.current &&
          initialTouchCenterRef.current) {
        
        e.preventDefault(); // Prevent page zoom
        
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        // Calculate target scale
        const rawScale = dist / initialPinchDistanceRef.current;
        let currentZoom = initialZoomRef.current * rawScale;
        
        // Clamp zoom level
        currentZoom = Math.max(1, Math.min(currentZoom, 3));
        
        // Calculate effective scale relative to the start of the gesture
        const effectiveScale = currentZoom / initialZoomRef.current;
        
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        // Calculate pan translation
        const panX = centerX - initialTouchCenterRef.current.x;
        const panY = centerY - initialTouchCenterRef.current.y;
        
        // Apply transform efficiently
        mapGrid.style.transformOrigin = `${initialPinchCenterRef.current.x}px ${initialPinchCenterRef.current.y}px`;
        mapGrid.style.transform = `translate(${panX}px, ${panY}px) scale(${effectiveScale})`;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // If fingers drop below 2, the pinch is over. Commit the change.
      if (e.touches.length < 2) {
         resetPinchState();
      }
    };

    // We need state to store the last valid transform values to commit on end
    let lastEffectiveScale = 1;
    let lastPanX = 0;
    let lastPanY = 0;

    const handleTouchMoveWithState = (e: TouchEvent) => {
      if (e.touches.length === 2 && 
          initialPinchDistanceRef.current !== null && 
          initialPinchCenterRef.current && 
          initialScrollRef.current &&
          initialTouchCenterRef.current) {
            
        e.preventDefault();
        
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        const rawScale = dist / initialPinchDistanceRef.current;
        let currentZoom = initialZoomRef.current * rawScale;
        currentZoom = Math.max(1, Math.min(currentZoom, 3));
        const effectiveScale = currentZoom / initialZoomRef.current;
        
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        const panX = centerX - initialTouchCenterRef.current.x;
        const panY = centerY - initialTouchCenterRef.current.y;
        
        lastEffectiveScale = effectiveScale;
        lastPanX = panX;
        lastPanY = panY;
        
        mapGrid.style.transformOrigin = `${initialPinchCenterRef.current.x}px ${initialPinchCenterRef.current.y}px`;
        mapGrid.style.transform = `translate(${panX}px, ${panY}px) scale(${effectiveScale})`;
      }
    };
    
    const resetPinchState = () => {
      if (initialPinchDistanceRef.current === null) return; // Already reset
      
      // Commit the zoom and scroll
      if (lastEffectiveScale !== 1 || lastPanX !== 0 || lastPanY !== 0) {
        const newZoom = initialZoomRef.current * lastEffectiveScale;
        const originX = initialPinchCenterRef.current?.x || 0;
        const originY = initialPinchCenterRef.current?.y || 0;
        const oldScrollLeft = initialScrollRef.current?.left || 0;
        const oldScrollTop = initialScrollRef.current?.top || 0;
        
        // Calculate new scroll position
        // Correct math: The point (originX) on the map moves to (originX * k).
        // We want to position the viewport such that this point remains at the same screen offset.
        // Screen Offset = originX - oldScrollLeft + panX
        // newScrollLeft = (originX * k) - (Screen Offset)
        // newScrollLeft = originX * k - (originX - oldScrollLeft + panX)
        // newScrollLeft = originX * k - originX + oldScrollLeft - panX
        // newScrollLeft = oldScrollLeft + originX * (k - 1) - panX
        
        const newScrollLeft = oldScrollLeft + originX * (lastEffectiveScale - 1) - lastPanX;
        const newScrollTop = oldScrollTop + originY * (lastEffectiveScale - 1) - lastPanY;
        
        // Update state - this triggers a re-render with new mapDimensions
        setZoomLevel(newZoom);
        
        // We must remove the transform immediately to prevent "double scaling" visually
        // But we must also apply the new scroll position.
        // Since mapDimensions updates synchronously in the next render (now that it's derived),
        // we can try to schedule the scroll update immediately after render.
        
        mapGrid.style.transform = '';
        mapGrid.style.transformOrigin = '';
        
        // Use requestAnimationFrame to allow the layout to update first
        requestAnimationFrame(() => {
          container.scrollTo({ left: newScrollLeft, top: newScrollTop, behavior: 'auto' });
        });
      }
      
      initialPinchDistanceRef.current = null;
      initialPinchCenterRef.current = null;
      initialTouchCenterRef.current = null;
      initialScrollRef.current = null;
      lastEffectiveScale = 1;
      lastPanX = 0;
      lastPanY = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveWithState, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMoveWithState);
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
              loc.grids.forEach(grid => {
                // Parse grid string "E4" -> Row E, Col 4
                const rowChar = grid.charAt(0).toUpperCase();
                const colNumStr = grid.slice(1);
                
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
                    id: `static-${loc.name}-${grid}`,
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
          ref={mapGridRef}
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