import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDecoration } from '../contexts/DecorationContext';
import type { DecorationInventoryItem, RoomDecorItem, DecorationItemType } from '../types';
import './FurnitureEditOverlay.css';

// Room zones for placement guidance
const ROOM_ZONES = {
  FLOOR: { startY: 70, endY: 100 },  // Bottom 30% is floor
  WALL: { startY: 15, endY: 70 },    // Middle is wall
  CEILING: { startY: 0, endY: 15 }   // Top 15% is ceiling
};

// Convert these to CSS variables to use for styling the grid
const ROOT_VARIABLES = {
  '--floor-start': `${ROOM_ZONES.FLOOR.startY}%`,
  '--wall-start': `${ROOM_ZONES.WALL.startY}%`,
  '--ceiling-start': `${ROOM_ZONES.CEILING.startY}%`
};

// Fixed base size used for calculating proportional scaling
const BASE_ITEM_SIZE = 100; // 100% = standard item size

// Main interface
interface FurnitureEditOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FurnitureEditOverlay({ isOpen, onClose }: FurnitureEditOverlayProps) {
  // --- CONTEXT & REFS ---
  const { decorations, roomLayers, addDecorItem, removeDecorItem, getFilteredDecorations, setRoomLayer } = useDecoration();
  const roomContainerRef = useRef<HTMLDivElement>(null);
  
  // --- STATE MANAGEMENT ---
  // Active decoration category
  const [activeCategory, setActiveCategory] = useState<DecorationItemType>('furniture');
  
  // Items for the active category
  const [availableItems, setAvailableItems] = useState<DecorationInventoryItem[]>([]);
  
  // Edit modes
  const [mode, setMode] = useState<'browse' | 'place' | 'edit'>('browse');
  
  // Selected item state
  const [selectedItem, setSelectedItem] = useState<{
    id: string;            // Unique identifier
    src: string;           // Image source
    x: number;             // X position (%)
    y: number;             // Y position (%)
    size: number;          // Size (% of base size)
    rotation: number;      // Rotation (degrees)
    layer: 'front' | 'back'; // Which layer
    existingIndex?: number;  // Index in existing items (if editing)
  } | null>(null);
  
  // Interaction states
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialRotation, setInitialRotation] = useState(0);
  const [initialPointerPosition, setInitialPointerPosition] = useState({ x: 0, y: 0 });
  
  // Responsive design state
  const [roomDimensions, setRoomDimensions] = useState({ width: 0, height: 0 });
  
  // UI control states
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  
  // --- LIFECYCLE EFFECTS ---
  
  // Update available items when category changes and reset state if not in furniture tab
  useEffect(() => {
    const items = getFilteredDecorations(activeCategory);
    setAvailableItems(items);
    
    // Reset selection and mode when switching away from furniture tab
    if (activeCategory !== 'furniture') {
      setSelectedItem(null);
      setMode('browse');
    }
  }, [activeCategory, getFilteredDecorations, decorations]);
  
  // Monitor room dimensions for responsive scaling
  useEffect(() => {
    if (!isOpen || !roomContainerRef.current) return;
    
    const updateDimensions = () => {
      if (!roomContainerRef.current) return;
      
      const { width, height } = roomContainerRef.current.getBoundingClientRect();
      setRoomDimensions({ width, height });
    };
    
    // Initial update
    updateDimensions();
    
    // Update on resize
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isOpen]);
  
  // Reset state when closing the overlay
  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null);
      setMode('browse');
    }
  }, [isOpen]);
  
  // --- UTILITY FUNCTIONS ---
  
  // Calculate actual pixel size based on percentage and container dimensions
  const getScaledSize = useCallback((sizePercent: number) => {
    // Base size is relative to the smaller dimension of the container
    const baseMeasure = Math.min(roomDimensions.width, roomDimensions.height);
    // Using BASE_ITEM_SIZE as a percentage of the container
    const baseSize = (BASE_ITEM_SIZE / 100) * baseMeasure; 
    return (sizePercent / 100) * baseSize;
  }, [roomDimensions]);
  
  // Convert screen coordinates to container percentages
  const screenToContainerPercent = useCallback((screenX: number, screenY: number) => {
    if (!roomContainerRef.current) return { x: 50, y: 50 };
    
    const rect = roomContainerRef.current.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 100;
    const y = ((screenY - rect.top) / rect.height) * 100;
    
    return { x, y };
  }, []);
  
  // Determine room zone based on Y-coordinate
  const getRoomZone = (y: number): "FLOOR" | "WALL" | "CEILING" => {
    if (y >= ROOM_ZONES.FLOOR.startY) return "FLOOR";
    if (y <= ROOM_ZONES.CEILING.endY) return "CEILING";
    return "WALL";
  };
  
  // Create a unique id for new items
  const createUniqueId = () => `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // --- EVENT HANDLERS ---
  
  // Select a category
  const handleCategorySelect = (category: DecorationItemType) => {
    setActiveCategory(category);
    setSelectedItem(null);
    setMode('browse');
  };
  
  // Handle click on inventory item
  const handleInventoryItemClick = (item: DecorationInventoryItem) => {
    // For non-furniture items (walls, floors, etc.) apply directly
    if (item.type !== 'furniture') {
      setRoomLayer(item.type as any, item.src);
      return;
    }
    
    // For furniture, create a new item in the center
    setSelectedItem({
      id: createUniqueId(),
      src: item.src,
      x: 50,
      y: 50,
      size: 100, // Default size = 100%
      rotation: 0,
      layer: 'back' // Default place behind pet
    });
    
    setMode('place');
  };
  
  // Handle click on an existing placed item
  const handlePlacedItemClick = (item: RoomDecorItem, layer: 'front' | 'back', index: number) => {
    if (isDragging || isRotating) return;
    
    setSelectedItem({
      id: createUniqueId(),
      src: item.src,
      x: item.x,
      y: item.y,
      size: item.width ? (item.width / getScaledSize(100)) * 100 : 100,
      rotation: item.rotation || 0,
      layer,
      existingIndex: index
    });
    
    setMode('edit');
  };
  
  // Start dragging an item
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    
    if (!selectedItem || !roomContainerRef.current) return;

    const { clientX, clientY } = e;
    const rect = roomContainerRef.current.getBoundingClientRect();
    
    // Calculate the offset from item center to pointer
    const itemCenterX = (selectedItem.x / 100) * rect.width + rect.left;
    const itemCenterY = (selectedItem.y / 100) * rect.height + rect.top;
    
    setDragOffset({
      x: (clientX - itemCenterX) / rect.width * 100,
      y: (clientY - itemCenterY) / rect.height * 100
    });
    
    setIsDragging(true);
    
    // Capture pointer to get events outside the element
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  
  // Start rotation
  const handleRotateStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedItem || !roomContainerRef.current) return;
    
    setIsRotating(true);
    setInitialRotation(selectedItem.rotation);
    
    const rect = roomContainerRef.current.getBoundingClientRect();
    
    // Get item center in page coordinates
    const itemCenterX = (selectedItem.x / 100) * rect.width + rect.left;
    const itemCenterY = (selectedItem.y / 100) * rect.height + rect.top;
    
    // Get initial angle
    const initialAngle = Math.atan2(
      e.clientY - itemCenterY,
      e.clientX - itemCenterX
    ) * (180 / Math.PI);
    
    setInitialPointerPosition({ x: e.clientX, y: e.clientY });
    setInitialRotation(selectedItem.rotation - initialAngle);
    
    // Capture pointer
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  
  // Handle pointer move (dragging or rotating)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && !isRotating) return;
    if (!selectedItem || !roomContainerRef.current) return;
    
    const { clientX, clientY } = e;
    const rect = roomContainerRef.current.getBoundingClientRect();
    
    if (isDragging) {
      // Calculate new position accounting for the offset
      const newX = ((clientX - rect.left) / rect.width * 100) - dragOffset.x;
      const newY = ((clientY - rect.top) / rect.height * 100) - dragOffset.y;
      
      // Constrain to room boundaries
      const finalX = Math.max(5, Math.min(95, newX));
      const finalY = Math.max(5, Math.min(95, newY));
      
      setSelectedItem({
        ...selectedItem,
        x: finalX,
        y: finalY
      });
    } else if (isRotating) {
      // Calculate item center
      const itemCenterX = (selectedItem.x / 100) * rect.width + rect.left;
      const itemCenterY = (selectedItem.y / 100) * rect.height + rect.top;
      
      // Calculate current angle
      const currentAngle = Math.atan2(
        clientY - itemCenterY,
        clientX - itemCenterX
      ) * (180 / Math.PI);
      
      // Apply the rotation, adding the initial rotation offset
      let newRotation = (initialRotation + currentAngle) % 360;
      if (newRotation < 0) newRotation += 360;
      
      setSelectedItem({
        ...selectedItem,
        rotation: newRotation
      });
    }
  };
  
  // End dragging or rotating
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsRotating(false);
    
    try {
      // Release pointer capture
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore errors if pointer capture wasn't set
    }
  };
  
  // Handle layer toggle (front/back)
  const handleLayerToggle = () => {
    if (!selectedItem) return;
    
    setSelectedItem({
      ...selectedItem,
      layer: selectedItem.layer === 'front' ? 'back' : 'front'
    });
  };
  
  // Handle size change via slider
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedItem) return;
    
    const newSize = parseInt(e.target.value, 10);
    setSelectedItem({
      ...selectedItem,
      size: newSize
    });
  };
  
  // Place or update item in the room
  const handleSaveItem = () => {
    if (!selectedItem) return;
    
    // If editing an existing item, remove it first
    if (selectedItem.existingIndex !== undefined) {
      removeDecorItem(selectedItem.layer, selectedItem.existingIndex);
    }
    
    // Determine zone based on Y position
    const zone = getRoomZone(selectedItem.y);
    
    // Convert from percentage size to actual pixel size
    const actualSize = getScaledSize(selectedItem.size);
    
    // Create item for the context
    const newItem: RoomDecorItem = {
      src: selectedItem.src,
      x: selectedItem.x,
      y: selectedItem.y,
      width: actualSize,
      height: actualSize,
      rotation: selectedItem.rotation,
      zone
    };
    
    // Add to the room
    addDecorItem(newItem, selectedItem.layer);
    
    // Reset state
    setSelectedItem(null);
    setMode('browse');
  };
  
  // Handle delete item
  const handleDeleteItem = () => {
    if (!selectedItem || selectedItem.existingIndex === undefined) return;
    
    removeDecorItem(selectedItem.layer, selectedItem.existingIndex);
    setSelectedItem(null);
    setMode('browse');
  };
  
  // Handle cancel action
  const handleCancel = () => {
    setSelectedItem(null);
    setMode('browse');
  };
  
  // Toggle panel collapse state
  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed);
  };
  
  // --- RENDERING LOGIC ---
  // If not open, don't render anything
  if (!isOpen) return null;
  
  // Get existing items from the room layers
  const frontItems = roomLayers?.frontDecor || [];
  const backItems = roomLayers?.backDecor || [];
  
  // Render function for existing furniture items - only show if in furniture category
  const renderFurnitureItems = () => {
    if (activeCategory !== 'furniture') return null;
    
    return (
      <>
        {/* Back layer items */}
        {backItems.map((item, index) => {
          const isSelected = selectedItem?.existingIndex === index && 
                            selectedItem?.layer === 'back' && 
                            mode === 'edit';
          
          // Skip rendering if this is the item being edited
          if (isSelected) return null;
          
          return (
            <div 
              key={`back-${index}`}
              className="placed-item"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}px`,
                height: `${item.height}px`,
                transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                zIndex: 10 + index
              }}
              onClick={() => handlePlacedItemClick(item, 'back', index)}
            >
              <img src={item.src} alt="" draggable="false" />
            </div>
          );
        })}
        
        {/* Currently selected/edited item */}
        {selectedItem && (
          <div 
            className={`active-item ${isDragging ? 'dragging' : ''} ${isRotating ? 'rotating' : ''}`}
            style={{
              left: `${selectedItem.x}%`,
              top: `${selectedItem.y}%`,
              width: `${getScaledSize(selectedItem.size)}px`, 
              height: `${getScaledSize(selectedItem.size)}px`,
              transform: `translate(-50%, -50%) rotate(${selectedItem.rotation}deg)`,
              zIndex: 1000
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img src={selectedItem.src} alt="" draggable="false" />
            
            {/* Rotation handle */}
            <div 
              className="rotation-handle"
              onPointerDown={handleRotateStart}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="handle-icon">⟳</div>
            </div>
          </div>
        )}
        
        {/* Front layer items */}
        {frontItems.map((item, index) => {
          const isSelected = selectedItem?.existingIndex === index && 
                            selectedItem?.layer === 'front' && 
                            mode === 'edit';
          
          // Skip rendering if this is the item being edited
          if (isSelected) return null;
          
          return (
            <div 
              key={`front-${index}`}
              className="placed-item"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}px`,
                height: `${item.height}px`,
                transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                zIndex: 40 + index
              }}
              onClick={() => handlePlacedItemClick(item, 'front', index)}
            >
              <img src={item.src} alt="" draggable="false" />
            </div>
          );
        })}
      </>
    );
  };
  
  return (
    <div className="furniture-edit-overlay" style={ROOT_VARIABLES as React.CSSProperties}>
      <div className="furniture-edit-header">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>{mode === 'browse' ? 'Select Item' : (mode === 'place' ? 'Place Item' : 'Edit Item')}</h2>
        <div className="header-spacer"></div>
      </div>
      
      <div className="edit-workspace">
        {/* Room preview with furniture */}
        <div 
          className="room-preview-area"
          ref={roomContainerRef}
        >
          {/* Grid zones for visual guidance */}
          <div className="room-zones">
            <div className="zone ceiling"></div>
            <div className="zone wall"></div>
            <div className="zone floor"></div>
          </div>
          
          {/* Render furniture items only when in furniture category */}
          {renderFurnitureItems()}
          
          {/* Visual guides */}
          <div className="placement-guides">
            <div className="center-point"></div>
            <div className="grid-line horizontal"></div>
            <div className="grid-line vertical"></div>
          </div>
        </div>
        
        {/* Controls Panel */}
        {mode === 'browse' ? (
          /* Item Selection Panel */
          <div className="item-selection-panel">
            <div className="category-tabs">
              <button 
                className={activeCategory === 'furniture' ? 'active' : ''}
                onClick={() => handleCategorySelect('furniture')}
              >
                Furniture
              </button>
              <button 
                className={activeCategory === 'wall' ? 'active' : ''}
                onClick={() => handleCategorySelect('wall')}
              >
                Walls
              </button>
              <button 
                className={activeCategory === 'floor' ? 'active' : ''}
                onClick={() => handleCategorySelect('floor')}
              >
                Floors
              </button>
              <button 
                className={activeCategory === 'ceiling' ? 'active' : ''}
                onClick={() => handleCategorySelect('ceiling')}
              >
                Ceilings
              </button>
              <button 
                className={activeCategory === 'trim' ? 'active' : ''}
                onClick={() => handleCategorySelect('trim')}
              >
                Trim
              </button>
            </div>
            
            <div className="items-grid">
              {availableItems.length > 0 ? (
                availableItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="item-card"
                    onClick={() => handleInventoryItemClick(item)}
                  >
                    <div className="item-image">
                      <img src={item.src} alt={item.name} />
                    </div>
                    <div className="item-name">{item.name}</div>
                  </div>
                ))
              ) : (
                <div className="empty-message">
                  No items available in this category
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Item Edit Controls */
          <div className={`item-edit-controls ${isPanelCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-handle" onClick={togglePanel}>
              {isPanelCollapsed ? '▲' : '▼'}
            </div>
            <div className="control-section">
              <div className="control-group">
                <label>Size <span className="value">{selectedItem?.size}%</span></label>
                <input 
                  type="range" 
                  min="50" 
                  max="150" 
                  value={selectedItem?.size || 100} 
                  onChange={handleSizeChange}
                />
              </div>
              
              <div className="control-group">
                <label>Position</label>
                <div className="position-display">
                  <div>X: {selectedItem?.x.toFixed(1)}%</div>
                  <div>Y: {selectedItem?.y.toFixed(1)}%</div>
                </div>
                <div className="position-hint">
                  Drag the item to reposition it
                </div>
              </div>
              
              <div className="control-group">
                <label>Rotation <span className="value">{Math.round(selectedItem?.rotation || 0)}°</span></label>
                <div className="rotation-hint">
                  Use the rotation handle to adjust the angle
                </div>
              </div>
              
              <div className="control-group">
                <label>Layer</label>
                <button 
                  className="layer-toggle"
                  onClick={handleLayerToggle}
                >
                  {selectedItem?.layer === 'back' ? 'Behind Pet' : 'In Front of Pet'}
                </button>
              </div>
            </div>
            
            <div className="action-buttons">
              <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
              {mode === 'edit' && (
                <button className="delete-btn" onClick={handleDeleteItem}>Delete</button>
              )}
              <button className="save-btn" onClick={handleSaveItem}>
                {mode === 'place' ? 'Place Item' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 