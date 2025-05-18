// src/pages/Sunnybrook.tsx
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MapCanvas from '../components/MapCanvas';
import MapBackButton from '../components/MapBackButton';
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Sunnybrook.css';

const getTiledObjectProperty = (object: TiledObject, propertyName: string): string | undefined => {
  if (!object.properties) return undefined;
  
  // Case-insensitive property name search to be more forgiving
  const property = object.properties.find(
    prop => prop.name.toLowerCase() === propertyName.toLowerCase()
  );
  
  return property?.value?.toString();
};

// Dimensions to match Tiled map editor settings
const TILED_MAP_WIDTH = 1024; 
const TILED_MAP_HEIGHT = 1536;
const MAP_ASPECT_RATIO = TILED_MAP_WIDTH / TILED_MAP_HEIGHT; // ~0.67
const SUNNYBROOK_MAP_URL = "/maps/sunnybrook_map_background.png";
const SUNNYBROOK_DATA_URL = "/maps/sunnybrook_map_data.json";

export default function Sunnybrook() {
  const location = useLocation();
  const isSunnybrookRoot = location.pathname === "/sunnybrook";
  
  const [mapDimensions, setMapDimensions] = useState({ width: window.innerWidth, height: window.innerWidth / MAP_ASPECT_RATIO });
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClickableAreas, setShowClickableAreas] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Calculate map dimensions based on viewport size - prioritize WIDTH
  useEffect(() => {
    const updateMapDimensions = () => {
      // Use full viewport width
      const viewportWidth = window.innerWidth;
      
      // Calculate height based on aspect ratio
      let mapWidth = viewportWidth;
      let mapHeight = mapWidth / MAP_ASPECT_RATIO;
      
      // If height is too tall, add some padding
      const viewportHeight = window.innerHeight;
      if (mapHeight > viewportHeight * 0.9) {
        mapHeight = viewportHeight * 0.9;
        mapWidth = mapHeight * MAP_ASPECT_RATIO;
      }
      
      console.log(`Map dimensions set to: ${mapWidth}x${mapHeight} (aspect ratio: ${MAP_ASPECT_RATIO})`);
      setMapDimensions({ width: mapWidth, height: mapHeight });
      setHasInitialized(true);
    };

    updateMapDimensions();
    window.addEventListener('resize', updateMapDimensions);
    return () => window.removeEventListener('resize', updateMapDimensions);
  }, []);

  // Simple direct function to navigate to the clinic
  const goToClinic = () => {
    console.log("DIRECT CLINIC NAVIGATION TRIGGERED");
    window.location.href = "/sunnybrook/SBClinic";
  };
  
  // Toggle debug mode to visualize clickable areas
  const toggleDebug = () => {
    setShowClickableAreas(!showClickableAreas);
    console.log("Debug mode toggled:", !showClickableAreas);
  };

  // Effect to fetch and process Tiled map data for hotspots
  useEffect(() => {
    console.log("Map data effect running, isSunnybrookRoot:", isSunnybrookRoot, "mapDimensions:", mapDimensions, "hasInitialized:", hasInitialized);
    
    let isMounted = true;
    
    if (!isSunnybrookRoot) {
      console.log("Not on Sunnybrook root, skipping map data fetch");
      setIsLoading(false);
      return;
    }
    
    // Skip if dimensions aren't ready yet, but don't stay in loading state forever
    if (!hasInitialized) {
      console.log("Waiting for map dimensions to initialize");
      return;
    }
    
    console.log("Starting to load map data...");
    setIsLoading(true);
    setError(null);
    
    const fetchMapData = async () => {
      if (!isMounted) return;

      try {
        console.log("Fetching map data from", SUNNYBROOK_DATA_URL);
        const response = await fetch(SUNNYBROOK_DATA_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.statusText} (status: ${response.status})`);
        }
        
        const tiledMapData: TiledMapData = await response.json();
        console.log("Tiled map data loaded successfully");
        
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");

        if (hotspotLayer && hotspotLayer.objects) {
          console.log("Found hotspot layer with", hotspotLayer.objects.length, "objects");
          
          const scaleX = mapDimensions.width / TILED_MAP_WIDTH;
          const scaleY = mapDimensions.height / TILED_MAP_HEIGHT;
          console.log("Scaling coordinates by", scaleX, scaleY);
          
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
            const scaledX = centerX * scaleX;
            const scaledY = centerY * scaleY;
            const scaledRadius = clickRadius * Math.min(scaleX, scaleY);
            
            console.log(`Hotspot ${nameProperty || obj.name}: Tiled(${centerX}, ${centerY}) → Scaled(${scaledX}, ${scaledY})`);

            return {
              id: idString || `tiled-obj-${obj.id}`,
              name: nameProperty || obj.name || 'Unnamed Hotspot',
              x: scaledX,
              y: scaledY,
              radius: scaledRadius,
              route: route || '/sunnybrook',
              iconSrc: iconSrc,
              iconSize: iconSize ? Math.round(iconSize * Math.min(scaleX, scaleY)) : undefined,
              type: type as 'location' | 'building'
            };
          });
          
          if (isMounted) {
            console.log("Processed", processedHotspots.length, "hotspots");
            setHotspots(processedHotspots);
            setIsLoading(false);
            console.log("Map loading complete, setting isLoading = false");
          }
        } else {
          console.warn("Could not find 'Hotspots' object layer in Sunnybrook map data.");
          if (isMounted) {
            setHotspots([]);
            setIsLoading(false);
            console.log("No hotspots found, setting isLoading = false");
          }
        }
      } catch (err) {
        console.error("Error loading or processing Sunnybrook map data:", err);
        if (isMounted) {
            setError(err instanceof Error ? err.message : String(err));
            setHotspots([]);
            setIsLoading(false);
            console.log("Error occurred, setting isLoading = false");
        }
      }
    };

    fetchMapData();
    return () => { 
      console.log("Cleanup function called");
      isMounted = false; 
    };
  }, [mapDimensions, isSunnybrookRoot, hasInitialized]);

  // For simplicity, just use this fallback navigation without React Router
  const handleHotspotClick = (hotspot: AppHotspot) => {
    console.log(`Clicked on hotspot: ${hotspot.name}, navigating to: ${hotspot.route}`);
    window.location.href = hotspot.route || '/sunnybrook';
  };

  if (!isSunnybrookRoot) {
    return (
      <>
        <Outlet />
        <MapBackButton destination="/sunnybrook" />
      </>
    ); 
  }

  // Force load for development/testing
  const forceLoad = () => {
    console.log("Forcing load to skip loading screen");
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="sunnybrook-status-message sunnybrook-loading">
        Loading Sunnybrook Map...
        <br />
        <button 
          onClick={forceLoad}
          style={{ marginTop: '20px', padding: '10px', cursor: 'pointer' }}
        >
          Skip Loading
        </button>
      </div>
    );
  }
  
  if (error) return <div className="sunnybrook-status-message sunnybrook-error">Error: {error}</div>;

  // Calculate scale based on actual map width
  const scale = mapDimensions.width / TILED_MAP_WIDTH;

  return (
    <div className="sunnybrook-page">
      {/* Debug toggle button */}
      <button 
        onClick={toggleDebug}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          padding: '5px 10px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {showClickableAreas ? 'Hide Debug' : 'Show Debug'}
      </button>
      
      <div 
        className="map-container"
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          background: '#000'
        }}
      >
        <div
          className="map-content"
          style={{
            width: `${mapDimensions.width}px`,
            height: `${mapDimensions.height}px`,
            position: 'relative',
            backgroundImage: `url(${SUNNYBROOK_MAP_URL})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Invisible clinic hotspot area */}
          <div
            onClick={goToClinic}
            style={{
              position: 'absolute',
              left: '675px',
              top: '445px',
              width: '60px',
              height: '60px',
              transform: `translate(-50%, -50%) scale(${scale})`,
              backgroundColor: showClickableAreas ? 'rgba(255, 0, 0, 0.3)' : 'transparent',
              border: showClickableAreas ? '2px solid white' : 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 999
            }}
          />

          <MapCanvas
            hotspots={hotspots}
            canvasWidth={mapDimensions.width}
            canvasHeight={mapDimensions.height}
            onHotspotClick={handleHotspotClick}
            mapWidth={mapDimensions.width}
            mapHeight={mapDimensions.height}
            gridSize={1} // No need for grid in Sunnybrook
            showBuildingAreas={showClickableAreas}
          />
          
          {/* Back button to World Map */}
          <MapBackButton 
            destination="/explore"
            size={45}
            position={{ left: 15, bottom: 60 }}
          />
        </div>
      </div>
    </div>
  );
}
