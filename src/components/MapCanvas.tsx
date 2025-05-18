// src/components/MapCanvas.tsx
import React, { useEffect, useRef } from 'react';
import type { AppHotspot } from '../types'; // Ensure AppHotspot is imported from your types file
import './MapCanvas.css'; // Styles for the canvas container if any (e.g., .hotspot-canvas-overlay)

interface MapCanvasProps {
  hotspots: AppHotspot[];
  canvasWidth: number;
  canvasHeight: number;
  onHotspotClick: (hotspot: AppHotspot) => void;
  mapWidth: number;
  mapHeight: number;
  gridSize: number;
  showBuildingAreas?: boolean; // Used to toggle visibility of building markers
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  hotspots,
  canvasWidth,
  canvasHeight,
  onHotspotClick,
  mapWidth,
  mapHeight,
  gridSize,
  showBuildingAreas = false,
}) => {
  const iconsRef = useRef<HTMLDivElement>(null);
  const buildingsRef = useRef<HTMLDivElement>(null);

  // Handle all location hotspots (with icons)
  useEffect(() => {
    const iconsContainer = iconsRef.current;
    if (!iconsContainer) return;

    // Clear previous icons
    iconsContainer.innerHTML = '';

    // Create icon elements for each hotspot in each grid cell
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const offsetX = x * mapWidth;
        const offsetY = y * mapHeight;

        hotspots.forEach(hotspot => {
          // Skip buildings - they'll be handled separately
          if (hotspot.type === 'building') return;
          
          if (hotspot.iconSrc) {
            const iconDiv = document.createElement('div');
            const size = hotspot.iconSize || 80;
            
            iconDiv.className = 'map-hotspot-icon';
            iconDiv.style.position = 'absolute';
            iconDiv.style.left = `${hotspot.x + offsetX - size/2}px`;
            iconDiv.style.top = `${hotspot.y + offsetY - size/2}px`;
            iconDiv.style.width = `${size}px`;
            iconDiv.style.height = `${size}px`;
            iconDiv.style.backgroundImage = `url(${hotspot.iconSrc})`;
            iconDiv.style.backgroundSize = 'contain';
            iconDiv.style.backgroundPosition = 'center';
            iconDiv.style.backgroundRepeat = 'no-repeat';
            iconDiv.style.cursor = 'pointer';
            iconDiv.style.zIndex = '20';
            
            // Add name as title attribute
            iconDiv.title = hotspot.name;
            
            // Attach click handler directly to the icon
            iconDiv.addEventListener('click', () => {
              onHotspotClick(hotspot);
            });
            
            iconsContainer.appendChild(iconDiv);
          }
        });
      }
    }
  }, [hotspots, mapWidth, mapHeight, gridSize, onHotspotClick]);

  // Handle building hotspots with clear visual elements
  useEffect(() => {
    const buildingsContainer = buildingsRef.current;
    if (!buildingsContainer) return;
    
    // Clear previous buildings
    buildingsContainer.innerHTML = '';
    
    // Create building elements
    hotspots.filter(h => h.type === 'building').forEach(hotspot => {
      // Create invisible clickable area
      const clickArea = document.createElement('div');
      const radius = hotspot.radius || 40;
      
      clickArea.className = 'map-building-clickarea';
      clickArea.style.position = 'absolute';
      clickArea.style.left = `${hotspot.x - radius}px`;
      clickArea.style.top = `${hotspot.y - radius}px`;
      clickArea.style.width = `${radius * 2}px`;
      clickArea.style.height = `${radius * 2}px`;
      clickArea.style.cursor = 'pointer';
      clickArea.style.zIndex = '24';
      clickArea.style.backgroundColor = showBuildingAreas ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.01)'; // Almost invisible unless debugging
      clickArea.style.borderRadius = '50%';
      clickArea.style.border = showBuildingAreas ? '1px dashed rgba(255,255,255,0.5)' : 'none';

      // Only create building marker if debug mode is on
      if (showBuildingAreas) {
        // Create building indicator dot
        const buildingMarker = document.createElement('div');
        buildingMarker.className = 'map-building-marker';
        buildingMarker.style.position = 'absolute';
        buildingMarker.style.left = `${hotspot.x - 15}px`; // Center the dot
        buildingMarker.style.top = `${hotspot.y - 15}px`;
        buildingMarker.style.width = '30px';
        buildingMarker.style.height = '30px';
        buildingMarker.style.backgroundColor = 'rgba(29, 140, 242, 0.9)';
        buildingMarker.style.borderRadius = '50%';
        buildingMarker.style.border = '3px solid white';
        buildingMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        buildingMarker.style.cursor = 'pointer';
        buildingMarker.style.zIndex = '25';
        
        // Add building name label
        const nameLabel = document.createElement('div');
        nameLabel.textContent = hotspot.name;
        nameLabel.style.position = 'absolute';
        nameLabel.style.bottom = '-25px';
        nameLabel.style.left = '50%';
        nameLabel.style.transform = 'translateX(-50%)';
        nameLabel.style.whiteSpace = 'nowrap';
        nameLabel.style.color = 'white';
        nameLabel.style.textShadow = '0 0 4px #000, 0 0 4px #000, 0 0 4px #000, 0 0 4px #000';
        nameLabel.style.fontWeight = 'bold';
        nameLabel.style.fontSize = '14px';
        nameLabel.style.pointerEvents = 'none';
        buildingMarker.appendChild(nameLabel);
        
        // Add name as title attribute (shows on hover)
        buildingMarker.title = hotspot.name;
        
        // Attach click handler to the marker
        buildingMarker.addEventListener('click', (e) => {
          console.log(`Clicked on building marker: ${hotspot.name}, route: ${hotspot.route}`);
          e.stopPropagation();
          onHotspotClick(hotspot);
        });
        
        buildingsContainer.appendChild(buildingMarker);
      }
      
      // Add name as title attribute (shows on hover)
      clickArea.title = hotspot.name;
      
      // Attach click handler to the clickable area
      clickArea.addEventListener('click', (e) => {
        console.log(`Clicked on building area: ${hotspot.name}, route: ${hotspot.route}`);
        e.stopPropagation();
        onHotspotClick(hotspot);
      });
      
      buildingsContainer.appendChild(clickArea);
    });
  }, [hotspots, mapWidth, mapHeight, gridSize, onHotspotClick, showBuildingAreas]);

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%',
      pointerEvents: 'none' 
    }}>
      {/* Buildings layer */}
      <div 
        ref={buildingsRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: 'auto'
        }}
      />
      {/* Icons layer (above buildings) */}
      <div 
        ref={iconsRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: 'auto'
        }}
      />
    </div>
  );
};

export default MapCanvas;