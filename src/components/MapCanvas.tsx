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
  showGrid?: boolean; // Shows coordinate grid for development
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
  showGrid = false,
}) => {
  const iconsRef = useRef<HTMLDivElement>(null);
  const buildingsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Handle Coordinate Grid
  useEffect(() => {
    const gridContainer = gridRef.current;
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    if (!showGrid) return;

    // Grid configuration
    const ROWS = 26; // A-Z
    const COLS = 20; // 1-20
    const rowHeight = mapHeight / ROWS;
    const colWidth = mapWidth / COLS;

    // Draw grid for each tile if needed, or just one large grid over the whole area
    // Assuming single map area repeated by gridSize, let's draw grid on the base map dimensions
    // repeated for the canvas size
    
    // Create grid cells
    // Since the grid container is sized to canvasWidth/canvasHeight (which is GRID_SIZE * mapWidth),
    // we need to fill the entire area with the grid pattern.
    // mapWidth/Height is the base tile size.
    
    const canvasRows = Math.ceil(canvasHeight / rowHeight);
    const canvasCols = Math.ceil(canvasWidth / colWidth);

    for (let y = 0; y < canvasRows; y++) {
      for (let x = 0; x < canvasCols; x++) {
        // Calculate label based on position relative to the base map tile
        // The map repeats every mapWidth/mapHeight
        // So we mod the coordinate by the base dimension to get the label
        
        const relativeY = y % ROWS;
        const relativeX = x % COLS;
        
        const cellId = `${String.fromCharCode(65 + relativeY)}${relativeX + 1}`; // A1... Z20 repeating
        
        const cell = document.createElement('div');
        cell.className = 'map-grid-cell';
        cell.style.position = 'absolute';
        cell.style.left = `${x * colWidth}px`;
        cell.style.top = `${y * rowHeight}px`;
        cell.style.width = `${colWidth}px`;
        cell.style.height = `${rowHeight}px`;
        cell.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.color = 'rgba(255, 255, 255, 0.8)';
        cell.style.fontSize = '16px'; // Reduced font size for denser grid
        cell.style.fontWeight = 'bold';
        cell.style.pointerEvents = 'none';
        cell.style.textShadow = '0 0 4px black';
        cell.textContent = cellId;
        
        gridContainer.appendChild(cell);
      }
    }
  }, [showGrid, mapWidth, mapHeight, canvasWidth, canvasHeight]);

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
            
            // Use full grid cell dimensions if available in hotspot (passed as radius/iconSize/etc or just calculated)
            // We want the whole grid cell to be clickable.
            // In Explore.tsx, we are passing specific width/height via iconSize/radius? 
            // Actually, Explore.tsx sets x,y to center and a radius.
            // Let's assume the hotspot.radius represents half the width/height of the clickable area if we want to fill the cell.
            // OR better: we should pass width/height explicitly.
            // For now, let's use the width/height we calculated for grid cells:
            const ROWS = 26; 
            const COLS = 20; 
            const cellHeight = mapHeight / ROWS;
            const cellWidth = mapWidth / COLS;
            
            iconDiv.className = 'map-hotspot-overlay';
            iconDiv.style.position = 'absolute';
            // hotspot.x/y is center, so subtract half width/height
            iconDiv.style.left = `${hotspot.x + offsetX - (cellWidth/2)}px`;
            iconDiv.style.top = `${hotspot.y + offsetY - (cellHeight/2)}px`;
            iconDiv.style.width = `${cellWidth}px`;
            iconDiv.style.height = `${cellHeight}px`;
            iconDiv.style.cursor = 'pointer';
            iconDiv.style.zIndex = '20';
            
            // Control visibility based on grid setting
            // If grid is shown, show red overlay. If hidden, make transparent but clickable
            if (showGrid) {
              iconDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
              iconDiv.style.border = '1px solid rgba(255, 0, 0, 0.5)';
            } else {
              iconDiv.style.backgroundColor = 'transparent';
              iconDiv.style.border = 'none';
            }
            
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
  }, [hotspots, mapWidth, mapHeight, gridSize, onHotspotClick, showGrid]);

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
      {/* Grid layer (for dev) */}
      <div 
        ref={gridRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasWidth, // Repeat grid over the entire canvas
          height: canvasHeight,
          pointerEvents: 'none',
          zIndex: 100
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