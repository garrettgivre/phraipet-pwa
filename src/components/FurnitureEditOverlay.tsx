import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDecoration } from '../contexts/DecorationContext';
import type { DecorationInventoryItem, RoomDecorItem, DecorationItemType } from '../types';
import './FurnitureEditOverlay.css';

// Room zones for furniture placement
const ROOM_ZONES = {
  FLOOR: { startY: 70, endY: 100 },
  WALL: { startY: 15, endY: 70 },
  CEILING: { startY: 0, endY: 15 }
};

interface FurnitureEditOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FurnitureEditOverlay({ isOpen, onClose }: FurnitureEditOverlayProps) {
  const { decorations, roomLayers, addDecorItem, removeDecorItem, getFilteredDecorations, setRoomLayer } = useDecoration();
  
  // Selected furniture item from inventory
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<DecorationInventoryItem | null>(null);
  
  // Selected placed furniture item for editing
  const [selectedPlacedItem, setSelectedPlacedItem] = useState<{
    item: RoomDecorItem;
    position: 'front' | 'back';
    index: number;
  } | null>(null);
  
  // Active category in the furniture inventory
  const [activeCategory, setActiveCategory] = useState<DecorationItemType>('furniture');
  
  // Editing states
  const [isPlacing, setIsPlacing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [size, setSize] = useState(100); // Size percentage
  const [position, setPosition] = useState<{x: number, y: number}>({ x: 50, y: 50 });
  const [placementLayer, setPlacementLayer] = useState<'front' | 'back'>('back'); // Default to back
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  // References
  const overlayRef = useRef<HTMLDivElement>(null);
  const roomContainerRef = useRef<HTMLDivElement>(null);
  
  // Helper function to add debug information
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => `${info}\n${prev.split('\n').slice(0, 5).join('\n')}`);
  };
  
  // Get furniture items based on active category
  const categoryItems = useMemo(() => {
    if (!decorations || decorations.length === 0) {
      addDebugInfo(`No decorations found in context`);
      return [];
    }
    
    addDebugInfo(`Fetching items for category: ${activeCategory}`);
    
    let items: DecorationInventoryItem[] = [];
    
    // We use getFilteredDecorations for all categories now for consistency
    items = getFilteredDecorations(activeCategory);
    
    addDebugInfo(`Found ${items.length} items for ${activeCategory}`);
    return items;
  }, [decorations, getFilteredDecorations, activeCategory]);
  
  // Reset state when opening the overlay
  useEffect(() => {
    if (isOpen) {
      addDebugInfo("Furniture edit overlay opened");
      setSelectedInventoryItem(null);
      setSelectedPlacedItem(null);
      setIsPlacing(false);
    }
  }, [isOpen]);
  
  // Combined front and back decor items for display/editing
  const frontDecorItems = roomLayers?.frontDecor || [];
  const backDecorItems = roomLayers?.backDecor || [];
  
  // Handle click on an inventory item
  const handleInventoryItemClick = (item: DecorationInventoryItem) => {
    addDebugInfo(`Clicked inventory item: ${item.name}, type: ${item.type}`);
    
    // For non-furniture items, apply directly to the room
    if (item.type !== 'furniture') {
      addDebugInfo(`Setting room layer: ${item.type} to ${item.src}`);
      setRoomLayer(item.type as any, item.src);
      return;
    }
    
    // For furniture items, enter placement mode
    setSelectedInventoryItem(item);
    setSelectedPlacedItem(null);
    setIsPlacing(true);
    setRotation(0);
    setSize(100);
    setPosition({ x: 50, y: 50 });
    addDebugInfo(`Entering placement mode for: ${item.name}`);
  };
  
  // Handle click on a placed furniture item
  const handlePlacedItemClick = (item: RoomDecorItem, position: 'front' | 'back', index: number) => {
    if (isPlacing || isDragging) return; // Ignore if in placement mode or already dragging
    
    addDebugInfo(`Selected placed item: layer ${position}, index ${index}`);
    setSelectedPlacedItem({ item, position, index });
    setSelectedInventoryItem(null);
    setRotation(item.rotation || 0);
    setSize(item.width ? (item.width / 120) * 100 : 100);
    setPosition({ x: item.x, y: item.y });
    setPlacementLayer(position);
  };
  
  // Handle drag start with direct event coordinates
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!roomContainerRef.current) {
      addDebugInfo("ERROR: roomContainerRef is null during drag start");
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    
    // Track where in the element the user clicked for more accurate dragging
    const containerRect = roomContainerRef.current.getBoundingClientRect();
    
    // Get clientX/Y either from mouse or touch event
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate offset from the item's center
    // We convert everything to container percentages for consistent drag behavior
    const itemCenterXPx = containerRect.width * (position.x / 100);
    const itemCenterYPx = containerRect.height * (position.y / 100);
    
    // Calculate the offset in pixels
    const offsetXPx = clientX - (containerRect.left + itemCenterXPx);
    const offsetYPx = clientY - (containerRect.top + itemCenterYPx);
    
    // Convert offsets to percentage of container
    const offsetXPercent = (offsetXPx / containerRect.width) * 100;
    const offsetYPercent = (offsetYPx / containerRect.height) * 100;
    
    addDebugInfo(`Drag start - offset: ${offsetXPercent.toFixed(2)}%, ${offsetYPercent.toFixed(2)}%`);
    
    // Define move handler that keeps the offset consistent
    function handleMove(moveEvent: MouseEvent | TouchEvent) {
      if (!roomContainerRef.current || !isDragging) return;
      
      // Prevent scrolling/default behavior
      moveEvent.preventDefault();
      
      const containerRect = roomContainerRef.current.getBoundingClientRect();
      const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      // Calculate new position keeping the offsets consistent
      const newXPercent = ((moveClientX - containerRect.left) / containerRect.width) * 100 - offsetXPercent;
      const newYPercent = ((moveClientY - containerRect.top) / containerRect.height) * 100 - offsetYPercent;
      
      // Constrain to room boundaries
      const constrainedX = Math.max(5, Math.min(95, newXPercent));
      const constrainedY = Math.max(5, Math.min(95, newYPercent));
      
      // Update position
      setPosition({ x: constrainedX, y: constrainedY });
    }
    
    // Define end handler
    function handleEnd() {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
      addDebugInfo(`Drag ended - new pos: ${position.x.toFixed(2)}%, ${position.y.toFixed(2)}%`);
    }
    
    // Add event listeners
    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
  };
  
  // Handle rotation via the rotation handle
  const handleRotationStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!roomContainerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering parent drag
    setIsRotating(true);
    
    // Get the phantom item element
    const phantomElement = document.querySelector('.phantom-item') as HTMLElement;
    if (!phantomElement) {
      addDebugInfo("ERROR: phantom element not found during rotation");
      return;
    }
    
    // Get center point of the phantom item as rotation origin
    const rect = phantomElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Initial angle calculation
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const initialAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    
    // Store the current rotation as starting point
    const startRotation = rotation;
    
    function handleRotateMove(moveEvent: MouseEvent | TouchEvent) {
      if (!isRotating) return;
      
      moveEvent.preventDefault();
      
      const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      // Calculate new angle
      const newAngle = Math.atan2(moveClientY - centerY, moveClientX - centerX) * (180 / Math.PI);
      
      // Calculate the change in angle
      let angleDelta = newAngle - initialAngle;
      
      // Apply the delta to the starting rotation
      let newRotation = (startRotation + angleDelta) % 360;
      if (newRotation < 0) newRotation += 360;
      
      setRotation(newRotation);
    }
    
    function handleRotateEnd() {
      setIsRotating(false);
      window.removeEventListener('mousemove', handleRotateMove);
      window.removeEventListener('touchmove', handleRotateMove);
      window.removeEventListener('mouseup', handleRotateEnd);
      window.removeEventListener('touchend', handleRotateEnd);
      addDebugInfo(`Rotation ended at ${rotation.toFixed(1)}°`);
    }
    
    window.addEventListener('mousemove', handleRotateMove, { passive: false });
    window.addEventListener('touchmove', handleRotateMove, { passive: false });
    window.addEventListener('mouseup', handleRotateEnd);
    window.addEventListener('touchend', handleRotateEnd);
  };
  
  // Handle rotation via slider
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRotation(parseInt(e.target.value, 10));
  };
  
  // Handle size change
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSize(parseInt(e.target.value, 10));
  };
  
  // Toggle placement layer (front/back)
  const handleLayerToggle = () => {
    setPlacementLayer(prev => {
      const newLayer = prev === 'front' ? 'back' : 'front';
      addDebugInfo(`Changed layer to: ${newLayer}`);
      return newLayer;
    });
  };
  
  // Handle category change
  const handleCategoryChange = (category: DecorationItemType) => {
    addDebugInfo(`Category changed to: ${category}`);
    setActiveCategory(category);
    setSelectedInventoryItem(null);
    setSelectedPlacedItem(null);
    setIsPlacing(false);
  };
  
  // Handle confirm placement of new furniture
  const handlePlaceItem = () => {
    if (!selectedInventoryItem) {
      addDebugInfo("ERROR: No inventory item selected for placement");
      return;
    }
    
    // Calculate final dimensions based on size percentage
    const baseSize = 120; // Base size at 100%
    const finalSize = (size / 100) * baseSize;
    
    // Determine which zone the item is in based on Y position
    let itemZone: "FLOOR" | "WALL" | "CEILING" = "WALL";
    if (position.y >= ROOM_ZONES.FLOOR.startY) {
      itemZone = "FLOOR";
    } else if (position.y <= ROOM_ZONES.CEILING.endY) {
      itemZone = "CEILING";
    }
    
    // Create the new decor item
    const newItem: RoomDecorItem = {
      src: selectedInventoryItem.src,
      x: position.x,
      y: position.y,
      width: finalSize,
      height: finalSize,
      rotation: rotation,
      zone: itemZone,
    };
    
    // Add to the appropriate layer
    addDebugInfo(`Placing item in ${placementLayer} layer at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
    addDecorItem(newItem, placementLayer);
    
    // Reset state
    setIsPlacing(false);
    setSelectedInventoryItem(null);
  };
  
  // Handle confirm edit of existing furniture
  const handleUpdateItem = () => {
    if (!selectedPlacedItem) {
      addDebugInfo("ERROR: No placed item selected for update");
      return;
    }
    
    // Remove the old item
    removeDecorItem(selectedPlacedItem.position, selectedPlacedItem.index);
    
    // Calculate final dimensions based on size percentage
    const baseSize = 120; // Base size at 100%
    const finalSize = (size / 100) * baseSize;
    
    // Determine which zone the item is in based on Y position
    let itemZone: "FLOOR" | "WALL" | "CEILING" = "WALL";
    if (position.y >= ROOM_ZONES.FLOOR.startY) {
      itemZone = "FLOOR";
    } else if (position.y <= ROOM_ZONES.CEILING.endY) {
      itemZone = "CEILING";
    }
    
    // Create the updated item
    const updatedItem: RoomDecorItem = {
      ...selectedPlacedItem.item,
      x: position.x,
      y: position.y,
      width: finalSize,
      height: finalSize,
      rotation: rotation,
      zone: itemZone,
    };
    
    // Add to the appropriate layer (may be different from original)
    addDebugInfo(`Updating item in ${placementLayer} layer (was in ${selectedPlacedItem.position})`);
    addDecorItem(updatedItem, placementLayer);
    
    // Reset state
    setSelectedPlacedItem(null);
  };
  
  // Handle delete item
  const handleDeleteItem = () => {
    if (!selectedPlacedItem) return;
    
    addDebugInfo(`Deleting item at index ${selectedPlacedItem.index} from ${selectedPlacedItem.position} layer`);
    removeDecorItem(selectedPlacedItem.position, selectedPlacedItem.index);
    setSelectedPlacedItem(null);
  };
  
  // Handle cancel placement/editing
  const handleCancel = () => {
    addDebugInfo("Cancelling placement/edit operation");
    setSelectedInventoryItem(null);
    setSelectedPlacedItem(null);
    setIsPlacing(false);
  };
  
  // Close the overlay
  const handleOverlayClose = () => {
    handleCancel();
    onClose();
  };
  
  // If not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="furniture-edit-overlay" ref={overlayRef}>
      <div className="furniture-edit-header">
        <button className="close-button" onClick={handleOverlayClose}>×</button>
        <h2>Edit Room</h2>
        <div className="header-spacer"></div>
      </div>
      
      <div className="edit-workspace">
        {/* Room preview area - shows the current room with edit controls */}
        <div className="room-preview-area" ref={roomContainerRef}>
          {/* Show placed items in the back layer only when not being edited */}
          {backDecorItems.map((item, index) => {
            const isCurrentlySelected = selectedPlacedItem?.position === 'back' && selectedPlacedItem?.index === index;
            if (isCurrentlySelected) return null; // Don't show the original when it's being edited
            
            return (
              <div 
                key={`back-${index}`}
                className={`placed-item`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: item.width ? `${item.width}px` : '120px',
                  height: item.height ? `${item.height}px` : '120px',
                  transform: item.rotation ? 
                    `translate(-50%, -50%) rotate(${item.rotation}deg)` : 
                    'translate(-50%, -50%)',
                  zIndex: 10 + index
                }}
                onClick={() => handlePlacedItemClick(item, 'back', index)}
              >
                <img src={item.src} alt="" />
              </div>
            );
          })}
          
          {/* Phantom item being placed or edited - only show when actively editing */}
          {(selectedInventoryItem || selectedPlacedItem) && (
            <div 
              className="phantom-item"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                width: `${(size / 100) * 120}px`,
                height: `${(size / 100) * 120}px`,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 1000
              }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <img 
                src={selectedInventoryItem?.src || selectedPlacedItem?.item.src} 
                alt="" 
                draggable="false"
              />
              
              {/* Rotation handle */}
              <div 
                className="rotation-handle"
                onMouseDown={handleRotationStart}
                onTouchStart={handleRotationStart}
              ></div>
            </div>
          )}
          
          {/* Show placed items in the front layer only when not being edited */}
          {frontDecorItems.map((item, index) => {
            const isCurrentlySelected = selectedPlacedItem?.position === 'front' && selectedPlacedItem?.index === index;
            if (isCurrentlySelected) return null; // Don't show the original when it's being edited
            
            return (
              <div 
                key={`front-${index}`}
                className={`placed-item`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: item.width ? `${item.width}px` : '120px',
                  height: item.height ? `${item.height}px` : '120px',
                  transform: item.rotation ? 
                    `translate(-50%, -50%) rotate(${item.rotation}deg)` : 
                    'translate(-50%, -50%)',
                  zIndex: 40 + index
                }}
                onClick={() => handlePlacedItemClick(item, 'front', index)}
              >
                <img src={item.src} alt="" />
              </div>
            );
          })}
          
          {/* Visual grid lines for better positioning */}
          <div className="placement-grid">
            <div className="grid-line horizontal" style={{ top: '25%' }}></div>
            <div className="grid-line horizontal" style={{ top: '50%' }}></div>
            <div className="grid-line horizontal" style={{ top: '75%' }}></div>
            <div className="grid-line vertical" style={{ left: '25%' }}></div>
            <div className="grid-line vertical" style={{ left: '50%' }}></div>
            <div className="grid-line vertical" style={{ left: '75%' }}></div>
          </div>
        </div>
        
        {/* Controls panel - shown when placing or editing item */}
        {(selectedInventoryItem || selectedPlacedItem) && (
          <div className="item-controls-panel">
            <div className="control-group">
              <label>Size <span className="value-display">{size}%</span></label>
              <input 
                type="range" 
                min="50" 
                max="150" 
                value={size} 
                onChange={handleSizeChange}
              />
            </div>
            
            <div className="control-group">
              <label>Rotation <span className="value-display">{Math.round(rotation)}°</span></label>
              <input 
                type="range" 
                min="0" 
                max="359" 
                value={Math.round(rotation)} 
                onChange={handleRotationChange}
              />
            </div>
            
            <div className="control-group">
              <label>Layer</label>
              <button 
                className={`layer-toggle ${placementLayer === 'back' ? 'active' : ''}`}
                onClick={handleLayerToggle}
              >
                {placementLayer === 'back' ? 'Behind Pet' : 'In Front of Pet'}
              </button>
            </div>
            
            <div className="control-actions">
              <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
              
              {selectedPlacedItem && (
                <button className="delete-btn" onClick={handleDeleteItem}>Delete</button>
              )}
              
              <button 
                className="confirm-btn"
                onClick={selectedInventoryItem ? handlePlaceItem : handleUpdateItem}
              >
                {selectedInventoryItem ? 'Place' : 'Update'}
              </button>
            </div>
          </div>
        )}
        
        {/* Furniture inventory panel - shown when not editing an item */}
        {!selectedInventoryItem && !selectedPlacedItem && (
          <div className="furniture-inventory-panel">
            <div className="category-tabs">
              <button 
                className={activeCategory === 'furniture' ? 'active' : ''}
                onClick={() => handleCategoryChange('furniture')}
              >
                Furniture
              </button>
              <button 
                className={activeCategory === 'wall' ? 'active' : ''}
                onClick={() => handleCategoryChange('wall')}
              >
                Walls
              </button>
              <button 
                className={activeCategory === 'floor' ? 'active' : ''}
                onClick={() => handleCategoryChange('floor')}
              >
                Floors
              </button>
              <button 
                className={activeCategory === 'ceiling' ? 'active' : ''}
                onClick={() => handleCategoryChange('ceiling')}
              >
                Ceilings
              </button>
              <button 
                className={activeCategory === 'trim' ? 'active' : ''}
                onClick={() => handleCategoryChange('trim')}
              >
                Trim
              </button>
            </div>
            
            <div className="inventory-items-grid">
              {categoryItems && categoryItems.length > 0 ? (
                categoryItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="inventory-item"
                    onClick={() => handleInventoryItemClick(item)}
                  >
                    <img src={item.src} alt={item.name} />
                    <span className="item-name">{item.name}</span>
                  </div>
                ))
              ) : (
                <div className="empty-category-message">
                  No items available in this category
                </div>
              )}
            </div>
            
            {/* Debug info panel */}
            {debugInfo && (
              <div className="debug-panel">
                <div className="debug-header">
                  <h4>Debug Info</h4>
                  <button onClick={() => setDebugInfo("")}>Clear</button>
                </div>
                <pre>{debugInfo}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 