// src/pages/Explore.tsx
// Removed React from imports as it's not explicitly needed with modern JSX transforms
import { useEffect, useState } from 'react';
import MapCanvas from '../components/MapCanvas'; 
// Corrected: Import AppHotspot from types, and other necessary Tiled types. TiledProperty removed.
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Explore.css'; 

// Helper function to get a custom property value from a Tiled object
const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  if (!object.properties) { // Defensive check
    return undefined;
  }
  return object.properties.find(p => p.name === propertyName)?.value;
};

export default function Explore() {
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]); // Use AppHotspot type
  const [mapPixelWidth, setMapPixelWidth] = useState(0);
  const [mapPixelHeight, setMapPixelHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Path to your world map background image in the `public` folder
  const mapImageUrl = "/maps/world_map_background.png"; 

  useEffect(() => {
    const fetchMapData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/maps/world_map_data.json'); 
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();

        // Determine map pixel dimensions by loading the image
        // This ensures MapCanvas gets the correct intrinsic dimensions for scaling
        const img = new Image();
        img.src = mapImageUrl;
        img.onload = () => {
            setMapPixelWidth(img.naturalWidth);
            setMapPixelHeight(img.naturalHeight);
        };
        img.onerror = () => {
            console.error("Could not load map image to determine dimensions. Using fallback dimensions.");
            // Set fallback dimensions if image fails to load, ensure these are reasonable for your map
            setMapPixelWidth(1200); 
            setMapPixelHeight(800); 
        }

        // Find the "Hotspots" object layer
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");
        
        if (hotspotLayer && hotspotLayer.objects) {
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map(obj => {
            // Tiled point objects have (x,y) at the point.
            // For rectangles, (x,y) is top-left. We use center for consistency.
            const centerX = obj.x + (obj.width / 2);
            const centerY = obj.y + (obj.height / 2);
            
            return {
              id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`,
              name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Hotspot',
              x: centerX,
              y: centerY, 
              route: getTiledObjectProperty(obj, 'route') || '/', // Default route if not specified
              iconSrc: getTiledObjectProperty(obj, 'iconSrc') || undefined,
            };
          });
          setHotspots(processedHotspots);
        } else {
          console.warn("Could not find 'Hotspots' object layer in map data. No hotspots will be displayed.");
          setHotspots([]); // Ensure hotspots is an empty array
        }
      } catch (err) {
        console.error("Error loading or processing map data:", err);
        setError(err instanceof Error ? err.message : String(err));
        setHotspots([]); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapData();
  }, [mapImageUrl]); // Re-fetch if mapImageUrl changes

  if (isLoading) {
    return <div className="explore-loading">Loading Map...</div>;
  }

  if (error) {
    return <div className="explore-error">Error loading map: {error}</div>;
  }
  
  // Ensure map dimensions are loaded before rendering MapCanvas
  if (mapPixelWidth === 0 || mapPixelHeight === 0) {
    return <div className="explore-loading">Determining map dimensions...</div>;
  }

  return (
    <div className="explore-page">
      {/* Pass the correct props to MapCanvas */}
      <MapCanvas 
        mapImageUrl={mapImageUrl} 
        hotspots={hotspots}
        mapPixelWidth={mapPixelWidth}
        mapPixelHeight={mapPixelHeight}
        // Removed incorrect props: width, height, onNavigate
      />
    </div>
  );
}
