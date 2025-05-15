// src/pages/Sunnybrook.tsx
import { useEffect, useState } from 'react'; // React import removed
import { Outlet, useLocation } from 'react-router-dom';
import MapCanvas from '../components/MapCanvas';
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Sunnybrook.css';

const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) {
    return undefined;
  }
  const property = object.properties.find(p => p.name === propertyName);
  return property?.value;
};

export default function Sunnybrook() {
  const location = useLocation();
  const isSunnybrookRoot = location.pathname === "/sunnybrook";

  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  const [mapPixelWidth, setMapPixelWidth] = useState(0);
  const [mapPixelHeight, setMapPixelHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapImageUrl = "/maps/sunnybrook_background.png"; 

  useEffect(() => {
    let isMounted = true;
    if (!isSunnybrookRoot) {
      setIsLoading(false); 
      return; 
    }

    const fetchMapData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setMapPixelWidth(0);
      setMapPixelHeight(0);
      setHotspots([]);

      let dimensionsAttempted = false;

      try {
        const img = new Image();
        img.src = mapImageUrl;
        await new Promise<void>((resolve) => {
            img.onload = () => {
                if (isMounted) {
                    setMapPixelWidth(img.naturalWidth);
                    setMapPixelHeight(img.naturalHeight);
                }
                dimensionsAttempted = true;
                resolve();
            };
            img.onerror = () => {
                console.error(`Sunnybrook.tsx: Failed to load map image at ${mapImageUrl} to determine dimensions. Using fallback.`);
                if (isMounted) {
                    setMapPixelWidth(1000); 
                    setMapPixelHeight(700); 
                }
                dimensionsAttempted = true;
                resolve();
            };
        });
      } catch (e) {
          console.error("Sunnybrook.tsx: Exception during image dimension loading:", e);
          if (isMounted) {
            setMapPixelWidth(1000);
            setMapPixelHeight(700);
          }
          dimensionsAttempted = true;
      }

      if (!isMounted || !dimensionsAttempted) {
        if (dimensionsAttempted && isMounted) setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/maps/sunnybrook_map_data.json'); 
        if (!response.ok) {
          throw new Error(`Failed to fetch Sunnybrook map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");
        
        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map(obj => ({
            id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
            name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Location',
            x: obj.x + (obj.width / 2), 
            y: obj.y + (obj.height / 2), 
            route: getTiledObjectProperty(obj, 'route') || `/sunnybrook`, 
            iconSrc: getTiledObjectProperty(obj, 'iconSrc') || undefined,
          }));
          if (isMounted) setHotspots(processedHotspots);
        } else {
          console.warn("Could not find 'Hotspots' object layer in Sunnybrook map data.");
          if (isMounted) setHotspots([]);
        }
      } catch (err) {
        console.error("Error loading or processing Sunnybrook map data:", err);
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
  }, [isSunnybrookRoot, mapImageUrl]);

  if (!isSunnybrookRoot) {
    return <Outlet />; 
  }

  if (isLoading) return <div className="sunnybrook-status-message sunnybrook-loading">Loading Sunnybrook Map...</div>;
  if (error) return <div className="sunnybrook-status-message sunnybrook-error">Error: {error}</div>;
  if (mapPixelWidth === 0 || mapPixelHeight === 0) {
    return <div className="sunnybrook-status-message sunnybrook-loading">Initializing map dimensions...</div>;
  }

  return (
    <div className="sunnybrook-page">
      <MapCanvas 
        mapImageUrl={mapImageUrl} 
        hotspots={hotspots}
        mapPixelWidth={mapPixelWidth}
        mapPixelHeight={mapPixelHeight}
      />
    </div>
  );
}
