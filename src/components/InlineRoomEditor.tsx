import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDecoration } from '../contexts/DecorationContext';
import type { DecorationInventoryItem, RoomDecorItem, DecorationItemType } from '../types';
import './InlineRoomEditor.css';

// Room zones for furniture placement
const ROOM_ZONES = {
  FLOOR: { startY: 70, endY: 100 },
  WALL: { startY: 15, endY: 70 },
  CEILING: { startY: 0, endY: 15 }
};

// Pet movement boundaries (percent of room width) - Match PetRoom exactly
const ROOM_BOUNDARIES = {
  LEFT: 15,   // Minimum left position (%) - adjusted for portrait
  RIGHT: 85   // Maximum right position (%) - adjusted for portrait
};

interface InlineRoomEditorProps {
  isOpen: boolean;
  onClose: () => void;
  petImage?: string;
  petPosition?: number;
  moodPhrase?: string;
  isFacingRight?: boolean;
}

interface EditableFurnitureItem {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  layer: 'front' | 'back';
  originalIndex?: number;
  originalLayer: 'front' | 'back';
}

export default function InlineRoomEditor({ isOpen, onClose, petImage, petPosition, moodPhrase, isFacingRight }: InlineRoomEditorProps) {
  const { 
    roomLayers, 
    addDecorItem, 
    removeDecorItem, 
    getFilteredDecorations, 
    setRoomLayer,
    updateDecorItem
  } = useDecoration();
  
  // Refs
  const roomRef = useRef<HTMLDivElement>(null);
  
  // State
  const [activeCategory, setActiveCategory] = useState<DecorationItemType>('furniture');
  const [availableItems, setAvailableItems] = useState<DecorationInventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<EditableFurnitureItem | null>(null);
  const [showInventory, setShowInventory] = useState(true);
  const [editMode, setEditMode] = useState<'move' | 'rotate' | 'resize'>('move');
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialState, setInitialState] = useState({ x: 0, y: 0, rotation: 0, scale: 1 });
  const [overlayBounds, setOverlayBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Update available items when category changes
  useEffect(() => {
    const items = getFilteredDecorations(activeCategory);
    setAvailableItems([...items]); // Force new array reference
    
    // Reset selection when changing categories
    setSelectedItem(null);
    setShowInventory(true);
  }, [activeCategory, getFilteredDecorations]);

  // Convert screen coordinates to room percentages
  const screenToRoomPercent = useCallback((screenX: number, screenY: number) => {
    const containerEl = roomRef.current;
    if (!containerEl) return { x: 50, y: 50 };
    const rect = containerEl.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((screenX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((screenY - rect.top) / rect.height) * 100))
    };
  }, []);

  // Match PetRoom's calculatePosition function exactly
  const calculatePosition = useCallback((x: number, y: number, width: number, height: number) => {
    // Apply room constraints like PetRoom does (constrainToRoom = true)
    const constrainedX = Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, x));

    // Scale dimensions relative to container size instead of fixed pixels
    let finalWidth, finalHeight;
    
    if (width && height) {
      // Use the actual pet room container directly
      const petRoomContainer = document.querySelector('.pet-room-inner-container') as HTMLElement;
      const containerWidth = petRoomContainer?.clientWidth || 300;
      const containerHeight = petRoomContainer?.clientHeight || 530;
      
      // Reference design size (9:16 aspect ratio)
      const refWidth = 1080;
      const refHeight = 1920;
      
      // Scale based on container dimensions to maintain proportions
      const widthRatio = containerWidth / refWidth;
      const heightRatio = containerHeight / refHeight;
      
      // Use the smaller ratio to ensure items fit in the container
      const scaleFactor = Math.min(widthRatio, heightRatio);
      
      finalWidth = width * scaleFactor;
      finalHeight = height * scaleFactor;
    }
    
    return {
      left: `${constrainedX}%`,
      top: `${y}%`,
      width: finalWidth ? `${finalWidth}px` : "auto",
      height: finalHeight ? `${finalHeight}px` : "auto",
      transform: "translate(-50%, -50%)"
    };
  }, []);

  // Handle inventory item click
  const handleInventoryItemClick = (item: DecorationInventoryItem) => {
    if (item.type !== 'furniture') {
      setRoomLayer(item.type, item.src);
      return;
    }

    const newItem: EditableFurnitureItem = {
      id: `new-${Date.now()}`,
      src: item.src,
      x: 50,
      y: 50,
      width: 300,
      height: 300,
      scale: 1,
      rotation: 0,
      layer: 'back',
      originalLayer: 'back'
    };

    setSelectedItem(newItem);
    setShowInventory(false);
  };

  // Handle clicking on existing furniture
  const handleFurnitureClick = (
    item: RoomDecorItem, 
    layer: 'front' | 'back', 
    index: number
  ) => {
    if (isDragging || isRotating || isResizing) return;

    const finalWidth = item.width || 300;
    const baseSize = 300;

    const editableItem: EditableFurnitureItem = {
      id: `existing-${layer}-${index}`,
      src: item.src,
      x: item.x,
      y: item.y,
      width: baseSize,
      height: baseSize,
      scale: finalWidth / baseSize,
      rotation: item.rotation || 0,
      layer,
      originalIndex: index,
      originalLayer: layer
    };

    setSelectedItem(editableItem);
    setShowInventory(false);
  };

  // Handle clicking outside to deselect
  const handleRoomClick = (e: React.MouseEvent) => {
    if (selectedItem && e.target === e.currentTarget) {
      setSelectedItem(null);
      setShowInventory(true);
    }
  };

  // Simple touch/mouse handling
  const handleStartDrag = (e: React.TouchEvent | React.MouseEvent, mode: 'move' | 'rotate' | 'resize') => {
    if (!selectedItem) return;

    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setEditMode(mode);
    if (mode === 'move') setIsDragging(true);
    else if (mode === 'rotate') setIsRotating(true);
    else if (mode === 'resize') setIsResizing(true);

    setDragStart({ x: clientX, y: clientY });
    setInitialState({
      x: selectedItem.x,
      y: selectedItem.y,
      rotation: selectedItem.rotation,
      scale: selectedItem.scale
    });
  };

  // Global mouse/touch move handler
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!selectedItem || !roomRef.current) return;
      if (!isDragging && !isRotating && !isResizing) return;

      e.preventDefault();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (isDragging) {
        const { x, y } = screenToRoomPercent(clientX, clientY);
        // Clamp by item size so it stays fully inside the room
        const containerEl = roomRef.current;
        const rect = containerEl?.getBoundingClientRect();
        const containerW = rect?.width || 1;
        const containerH = rect?.height || 1;
        const scaledW = (selectedItem.width * selectedItem.scale) || 0;
        const scaledH = (selectedItem.height * selectedItem.scale) || 0;
        const halfWPct = Math.min(50, (scaledW / containerW) * 50);
        const halfHPct = Math.min(50, (scaledH / containerH) * 50);
        // Allow full edge placement (no extra side margins)
        const leftBound = halfWPct;
        const rightBound = 100 - halfWPct;
          const clampedX = Math.max(leftBound, Math.min(rightBound, x));
        // Allow to edges: do not enforce extra 5% margins
        const clampedY = Math.max(halfHPct, Math.min(100 - halfHPct, y));
        setSelectedItem(prev => prev ? { ...prev, x: clampedX, y: clampedY } : null);
      } else if (isRotating) {
        const containerEl = roomRef.current;
        if (containerEl) {
          const rect = containerEl.getBoundingClientRect();
          const centerX = rect.left + (rect.width * selectedItem.x / 100);
          const centerY = rect.top + (rect.height * selectedItem.y / 100);
          const angle = Math.atan2(clientY - centerY, clientX - centerX);
          const angleDegrees = (angle * (180 / Math.PI) + 360) % 360;
          const deltaAngle = angleDegrees - (Math.atan2(dragStart.y - centerY, dragStart.x - centerX) * (180 / Math.PI));
          const newRotation = (initialState.rotation + deltaAngle + 360) % 360;
          
          setSelectedItem(prev => prev ? { ...prev, rotation: newRotation } : null);
        }
      } else if (isResizing) {
        const dx = clientX - dragStart.x;
        const dy = clientY - dragStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const direction = dx + dy > 0 ? 1 : -1;
        const newScale = Math.max(0.3, Math.min(3, initialState.scale + (direction * distance / 80)));
        setSelectedItem(prev => prev ? { ...prev, scale: newScale } : null);
      }
    };

    const handleGlobalEnd = () => {
      setIsDragging(false);
      setIsRotating(false);
      setIsResizing(false);
    };

    if (isDragging || isRotating || isResizing) {
      document.addEventListener('mousemove', handleGlobalMove);
      document.addEventListener('mouseup', handleGlobalEnd);
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('touchend', handleGlobalEnd);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMove);
        document.removeEventListener('mouseup', handleGlobalEnd);
        document.removeEventListener('touchmove', handleGlobalMove);
        document.removeEventListener('touchend', handleGlobalEnd);
      };
    }
  }, [isDragging, isRotating, isResizing, selectedItem, dragStart, initialState, screenToRoomPercent]);

  // Save furniture placement
  const handleSave = () => {
    if (!selectedItem) return;

    const zone = selectedItem.y >= ROOM_ZONES.FLOOR.startY ? 'FLOOR' :
                selectedItem.y <= ROOM_ZONES.CEILING.endY ? 'CEILING' : 'WALL';

    const finalWidth = selectedItem.width * selectedItem.scale;
    const finalHeight = selectedItem.height * selectedItem.scale;

    const itemToSave: RoomDecorItem = {
      src: selectedItem.src,
      x: selectedItem.x,
      y: selectedItem.y,
      width: finalWidth,
      height: finalHeight,
      rotation: selectedItem.rotation,
      zone
    };

    const currentSelectedItem = selectedItem;
    setSelectedItem(null);
    setShowInventory(true);

    if (currentSelectedItem.originalIndex !== undefined) {
      updateDecorItem(currentSelectedItem.originalLayer, currentSelectedItem.originalIndex, itemToSave, currentSelectedItem.layer);
    } else {
      addDecorItem(itemToSave, currentSelectedItem.layer);
    }
  };

  const handleDelete = () => {
    if (!selectedItem || selectedItem.originalIndex === undefined) return;
    removeDecorItem(selectedItem.originalLayer, selectedItem.originalIndex);
    setSelectedItem(null);
    setShowInventory(true);
  };

  const handleCancel = () => {
    setSelectedItem(null);
    setShowInventory(true);
  };

  // Position overlay to match pet room container exactly
  useEffect(() => {
    const updateOverlayBounds = () => {
      const petRoomContainer = document.querySelector('.pet-room-inner-container') as HTMLElement;
      if (petRoomContainer && roomRef.current) {
        const rect = petRoomContainer.getBoundingClientRect();
        const pageRect = document.body.getBoundingClientRect();
        
        setOverlayBounds({
          top: rect.top - pageRect.top,
          left: rect.left - pageRect.left,
          width: rect.width,
          height: rect.height
        });
      }
    };

    if (isOpen) {
      updateOverlayBounds();
      window.addEventListener('resize', updateOverlayBounds);
      return () => window.removeEventListener('resize', updateOverlayBounds);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const frontDecor = roomLayers?.frontDecor || [];
  const backDecor = roomLayers?.backDecor || [];

  return (
    <div className="inline-room-editor">
      {/* Simple overlay positioned over the pet room */}
      <div 
        className="room-editor-overlay"
        ref={roomRef}
        onClick={handleRoomClick}
        style={{
          top: overlayBounds.top,
          left: overlayBounds.left,
          width: overlayBounds.width,
          height: overlayBounds.height,
          right: 'auto',
          bottom: 'auto'
        }}
      >
        {/* Room zones visualization */}
        <div className="room-zones">
          <div className="zone ceiling"></div>
          <div className="zone wall"></div>
          <div className="zone floor"></div>
        </div>

        {/* Placed furniture - render EXACTLY like PetRoom */}
        {activeCategory === 'furniture' && (
          <>
            {/* Back layer furniture */}
            {backDecor.map((item, idx) => {
              const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0);
              
              const isBeingEdited = selectedItem && 
                selectedItem.originalLayer === 'back' && 
                selectedItem.originalIndex === idx;
              
              if (isBeingEdited) return null;
              
              return (
                <img
                  key={`back-decor-${idx}`}
                  className="editor-decor back-layer"
                  src={item.src}
                  style={{
                    position: 'absolute',
                    left: position.left,
                    top: position.top,
                    width: position.width,
                    height: position.height,
                    zIndex: 20,
                    objectFit: "contain",
                    transform: item.rotation 
                      ? `translate(-50%, -50%) rotate(${item.rotation}deg)` 
                      : position.transform
                  }}
                  alt=""
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFurnitureClick(item, 'back', idx);
                  }}
                />
              );
            })}

            {/* Pet Layer - positioned between back and front furniture */}
            {petImage && petPosition !== undefined && (
              <>
                {/* Pet Sprite - Use same class and styling as original */}
                <img 
                  className={`pet-layer ${isFacingRight ? 'flip' : ''}`}
                  src={petImage}
                  style={{ 
                    left: `${petPosition}%`
                  }}
                  alt="Pet"
                />
                
                {/* Speech bubble if present */}
                {moodPhrase && (
                  <div 
                    className="pet-mood-bubble"
                    style={{ 
                      position: 'absolute',
                      left: `${Math.max(ROOM_BOUNDARIES.LEFT, Math.min(ROOM_BOUNDARIES.RIGHT, petPosition))}%`,
                      bottom: 'calc(42% + 10px)',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
                      borderRadius: '15px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      maxWidth: 'min(200px, 80vw)',
                      textAlign: 'center',
                      zIndex: 31,
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      pointerEvents: 'none'
                    }}
                  >
                    <div 
                      style={{ 
                        position: 'absolute', 
                        bottom: '-7px',
                        left: '50%', 
                        transform: 'translateX(-50%)', 
                        width: '0', 
                        height: '0', 
                        borderLeft: '7px solid transparent', 
                        borderRight: '7px solid transparent', 
                        borderTop: '9px solid rgba(255, 255, 255, 0.9)' 
                      }} 
                    />
                    <p style={{ margin: 0, color: '#333', lineHeight: 1.3, padding: 0 }}>
                      {moodPhrase}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Front layer furniture */}
            {frontDecor.map((item, idx) => {
              const position = calculatePosition(item.x, item.y, item.width || 0, item.height || 0);
              
              const isBeingEdited = selectedItem && 
                selectedItem.originalLayer === 'front' && 
                selectedItem.originalIndex === idx;
              
              if (isBeingEdited) return null;
              
              return (
                <img
                  key={`front-decor-${idx}`}
                  className="editor-decor"
                  src={item.src}
                  style={{
                    position: 'absolute',
                    left: position.left,
                    top: position.top,
                    width: position.width,
                    height: position.height,
                    zIndex: 40 + idx,
                    objectFit: "contain",
                    transform: item.rotation 
                      ? `translate(-50%, -50%) rotate(${item.rotation}deg)` 
                      : position.transform
                  }}
                  alt=""
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFurnitureClick(item, 'front', idx);
                  }}
                />
              );
            })}
          </>
        )}

        {/* Selected item being edited */}
        {selectedItem && (
          (() => {
            const scaledWidth = selectedItem.width * selectedItem.scale;
            const scaledHeight = selectedItem.height * selectedItem.scale;
            const position = calculatePosition(selectedItem.x, selectedItem.y, scaledWidth, scaledHeight);
            return (
              <div
                className={`selected-furniture ${isDragging ? 'dragging' : ''} ${isRotating ? 'rotating' : ''} ${isResizing ? 'resizing' : ''}`}
                style={{
                  position: 'absolute',
                  left: position.left,
                  top: position.top,
                  width: position.width,
                  height: position.height,
                  transform: `translate(-50%, -50%) rotate(${selectedItem.rotation}deg)`,
                  zIndex: 1500
                }}
                onPointerDown={(e) => handleStartDrag(e, 'move')}
              >
                <img src={selectedItem.src} alt="" draggable={false} />
                <div className="furniture-controls" style={{ zIndex: 1700 }}>
                  <div 
                    style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '36px', height: '36px', backgroundColor: '#9C27B0', border: '2px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '25px', color: 'white', fontWeight: 'bold', cursor: 'grab', zIndex: 1700, pointerEvents: 'auto', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                    title="Rotate"
                    onPointerDown={(e) => handleStartDrag(e, 'rotate')}
                  >
                    ↻
                  </div>
                  <div 
                    style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '36px', height: '36px', backgroundColor: '#FFC107', border: '2px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#111', fontWeight: 700, cursor: 'pointer', zIndex: 1700, pointerEvents: 'auto', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                    title={`Layer: ${selectedItem.layer === 'front' ? 'Front (in front of pet)' : 'Back (behind pet)'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(prev => prev ? { ...prev, layer: prev.layer === 'front' ? 'back' : 'front' } : null);
                    }}
                  >
                    {selectedItem.layer === 'front' ? 'Front' : 'Back'}
                  </div>
                  <div 
                    style={{ position: 'absolute', bottom: '-50px', left: '50%', transform: 'translateX(-50%)', width: '36px', height: '36px', backgroundColor: '#2196F3', border: '2px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '25px', color: 'white', fontWeight: 'bold', cursor: 'nw-resize', zIndex: 1700, pointerEvents: 'auto', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                    title="Resize"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleStartDrag(e, 'resize');
                    }}
                  >
                    ⤡
                  </div>
                  <div 
                    style={{ position: 'absolute', top: '-50px', right: '-50px', width: '36px', height: '36px', backgroundColor: '#F44336', border: '2px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '25px', color: 'white', fontWeight: 'bold', cursor: 'pointer', zIndex: 1700, pointerEvents: 'auto', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedItem.originalIndex !== undefined) {
                        handleDelete();
                      }
                    }}
                  >
                    ×
                  </div>
                  <div 
                    style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '36px', height: '36px', backgroundColor: '#4CAF50', border: '2px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '25px', color: 'white', fontWeight: 'bold', cursor: 'pointer', zIndex: 1700, pointerEvents: 'auto', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                    title={selectedItem.originalIndex !== undefined ? 'Update' : 'Place'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave();
                    }}
                  >
                    ✓
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Toggle inventory button */}
        {!showInventory && (
          <button 
            className="toggle-inventory-btn" 
            onClick={() => setShowInventory(true)}
            title="Show Items"
          >
            📦
          </button>
        )}
      </div>

      {/* Sliding inventory panel */}
      {showInventory && (
        <div className="inventory-panel">
          {/* Paintbrush button positioned above the panel */}
          <button className="paintbrush-floating-btn" onClick={onClose} title="Exit Edit Mode">
            <img src="/assets/icons/paintbrush.png" alt="Exit Edit Mode" />
          </button>
          
          <div className="inventory-header">
            <h3>Room Designer</h3>
            <div className="category-tabs">
              {(['furniture', 'wall', 'floor', 'ceiling', 'trim'] as DecorationItemType[]).map(category => (
                <button
                  key={category}
                  className={activeCategory === category ? 'active' : ''}
                  onClick={() => setActiveCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="inventory-grid" key={`${activeCategory}-${availableItems.length}`}>
            {availableItems.map((item, index) => (
              <div
                key={`${item.src}-${index}`}
                className="inventory-item"
                onClick={() => handleInventoryItemClick(item)}
              >
                <img src={item.src} alt={item.name} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons for selected item */}
      {selectedItem && (
        <div className="action-bar">
          <div className="edit-mode-display">
            <span>Mode: {editMode}</span>
            {selectedItem.layer && <span>Layer: {selectedItem.layer}</span>}
            <span>Scale: {Math.round(selectedItem.scale * 100)}%</span>
          </div>
          
          <div className="action-buttons">
            <button onClick={handleCancel} className="cancel-btn">Cancel</button>
            {selectedItem.originalIndex !== undefined && (
              <button onClick={handleDelete} className="delete-btn">Delete</button>
            )}
            <button onClick={handleSave} className="save-btn">
              {selectedItem.originalIndex !== undefined ? 'Update' : 'Place'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}