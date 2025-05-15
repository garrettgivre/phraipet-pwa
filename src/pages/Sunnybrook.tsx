// src/pages/Sunnybrook.tsx
// 'React' and 'Link' imports are removed as they are not directly used.
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom'; // Link was removed from here
import MapCanvas from '../components/MapCanvas';
// Removed TiledProperty from this import as it's not directly used in this file.
import type { AppHotspot, TiledMapData, TiledObject } from '../types'; 
import './Sunnybrook.css';

// Helper function to get a custom property value from a Tiled object.
// This function safely accesses properties and their values.
const getTiledObjectProperty = (object: TiledObject, propertyName: string): any | undefined => {
  // Check if the 'properties' array exists on the object.
  if (!object.properties) {
    return undefined;
  }
  // Find the property by its name.
  const property = object.properties.find(p => p.name === propertyName);
  // Return the value of the property if found, otherwise undefined.
  return property?.value;
};

export default function Sunnybrook() {
  const location = useLocation();
  // Determines if the current route is the root "/sunnybrook" page.
  // This is used to decide whether to display the map or the content of a sub-route (e.g., a specific building).
  const isSunnybrookRoot = location.pathname === "/sunnybrook";

  // State for storing processed hotspot data for the MapCanvas.
  const [hotspots, setHotspots] = useState<AppHotspot[]>([]);
  // State for the pixel dimensions of the map background image.
  const [mapPixelWidth, setMapPixelWidth] = useState(0);
  const [mapPixelHeight, setMapPixelHeight] = useState(0);
  // State for managing loading status while fetching map data.
  const [isLoading, setIsLoading] = useState(true);
  // State for storing any errors encountered during data fetching.
  const [error, setError] = useState<string | null>(null);

  // URL for the Sunnybrook map background image.
  // Ensure this image is located in your `public/maps/` directory.
  const mapImageUrl = "/maps/sunnybrook_background.png"; 

  useEffect(() => {
    // Only fetch map data if currently on the root "/sunnybrook" page.
    if (!isSunnybrookRoot) {
      setIsLoading(false); // Ensure loading is false if not fetching map.
      return; 
    }

    const fetchMapData = async () => {
      setIsLoading(true); // Set loading true at the start of fetching.
      setError(null); // Clear any previous errors.
      try {
        // Fetch the Tiled JSON data for the Sunnybrook map.
        const response = await fetch('/maps/sunnybrook_map_data.json'); 
        if (!response.ok) {
          // Throw an error if the network response is not ok.
          throw new Error(`Failed to fetch Sunnybrook map data: ${response.statusText} (status: ${response.status})`);
        }
        const tiledMapData: TiledMapData = await response.json();

        // Determine map dimensions from the loaded background image.
        // This is crucial for accurate scaling of hotspots on the canvas.
        const img = new Image();
        img.src = mapImageUrl;
        img.onload = () => {
            setMapPixelWidth(img.naturalWidth);
            setMapPixelHeight(img.naturalHeight);
        };
        img.onerror = () => {
            // Fallback dimensions if the image fails to load. Adjust these to your map's actual size.
            console.error("Could not load Sunnybrook map image to determine dimensions. Using fallback dimensions.");
            setMapPixelWidth(1000); 
            setMapPixelHeight(700); 
        }

        // Find the "Hotspots" object layer within the Tiled map data.
        const hotspotLayer = tiledMapData.layers.find(layer => layer.name === "Hotspots" && layer.type === "objectgroup");
        
        if (hotspotLayer && hotspotLayer.objects) {
          // Process Tiled objects into the AppHotspot format.
          const processedHotspots: AppHotspot[] = hotspotLayer.objects.map(obj => ({
            id: getTiledObjectProperty(obj, 'id_string') || `tiled-obj-${obj.id}`, // Use custom 'id_string' or Tiled's ID.
            name: getTiledObjectProperty(obj, 'name') || obj.name || 'Unnamed Location', // Use custom 'name' or object's name.
            // Calculate center of the Tiled object for x and y coordinates.
            x: obj.x + (obj.width / 2), 
            y: obj.y + (obj.height / 2), 
            route: getTiledObjectProperty(obj, 'route') || `/sunnybrook`, // Fallback route if not specified.
            iconSrc: getTiledObjectProperty(obj, 'iconSrc') || undefined, // Optional icon source.
          }));
          setHotspots(processedHotspots);
        } else {
          console.warn("Could not find 'Hotspots' object layer in Sunnybrook map data. No hotspots will be displayed.");
          setHotspots([]); // Set to empty array if no hotspots layer.
        }
      } catch (err) {
        // Handle errors during fetching or processing.
        console.error("Error loading or processing Sunnybrook map data:", err);
        setError(err instanceof Error ? err.message : String(err));
        setHotspots([]); // Clear hotspots on error.
      } finally {
        setIsLoading(false); // Set loading to false once processing is complete or an error occurs.
      }
    };

    fetchMapData();
  }, [isSunnybrookRoot, mapImageUrl]); // Dependencies for the useEffect hook.

  // If the current route is not the root Sunnybrook page, render the child route (e.g., SBClinic).
  if (!isSunnybrookRoot) {
    return <Outlet />; 
  }

  // Display loading or error messages while data is being fetched or if an error occurred.
  if (isLoading) return <div className="sunnybrook-loading">Loading Sunnybrook Map...</div>;
  if (error) return <div className="sunnybrook-error">Error loading map: {error}</div>;
  // Ensure map dimensions are loaded before attempting to render the MapCanvas.
  if (mapPixelWidth === 0 || mapPixelHeight === 0) {
    return <div className="sunnybrook-loading">Determining map dimensions...</div>;
  }

  // Render the MapCanvas with the Sunnybrook map and its hotspots.
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
