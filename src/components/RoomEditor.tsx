import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDecoration } from '../contexts/DecorationContext';
import type { DecorationInventoryItem, RoomDecorItem, DecorationItemType } from '../types';
import './RoomEditor.css';

// Constants for room layout
const ROOM_ZONES = {
  FLOOR: { startY: 70, endY: 100 },
  WALL: { startY: 15, endY: 70 },
  CEILING: { startY: 0, endY: 15 }
};

interface RoomEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FurnitureItem extends Omit<RoomDecorItem, 'width' | 'height'> {
  id: string;
  scale: number;
  zIndex: number;
  width: number;
  height: number;
}

export default function RoomEditor({ isOpen, onClose }: RoomEditorProps) {
  const { 
    roomLayers, 
    addDecorItem, 
    getFilteredDecorations, 
    setRoomLayer 
  } = useDecoration();
  
  // Refs
  const roomContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  
  // State for room editing
  const [activeCategory, setActiveCategory] = useState<DecorationItemType>('furniture');
  const [availableItems, setAvailableItems] = useState<DecorationInventoryItem[]>([]);
  
  // State for furniture manipulation
  const [selectedItem, setSelectedItem] = useState<FurnitureItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState({ 
    x: 0, y: 0, rotation: 0, scale: 1 
  });

  // UI State
  const [showInventory, setShowInventory] = useState(true);
  const [editMode, setEditMode] = useState<'move' | 'rotate' | 'resize'>('move');
  
  // Update available items when category changes
  useEffect(() => {
    const items = getFilteredDecorations(activeCategory);
    setAvailableItems(items);
  }, [activeCategory, getFilteredDecorations]);

  // Convert screen coordinates to room percentages
  const screenToRoomPercent = useCallback((screenX: number, screenY: number) => {
    if (!roomContainerRef.current) return { x: 0, y: 0 };
    const rect = roomContainerRef.current.getBoundingClientRect();
    return { x: ((screenX - rect.left) / rect.width) * 100, y: ((screenY - rect.top) / rect.height) * 100 };
  }, []);

  // Handle pointer down for dragging/rotating/resizing
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!selectedItem || !roomContainerRef.current) return;
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target.classList.contains('rotate-handle')) {
      setEditMode('rotate');
      setIsRotating(true);
    } else if (target.classList.contains('resize-handle')) {
      setEditMode('resize');
      setIsResizing(true);
    } else {
      setEditMode('move');
      setIsDragging(true);
    }
    const { clientX, clientY } = e;
    setDragStart({ x: clientX, y: clientY });
    setInitialTransform({ x: selectedItem.x, y: selectedItem.y, rotation: selectedItem.rotation || 0, scale: selectedItem.scale });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!selectedItem || !roomContainerRef.current) return;
    if (!isDragging && !isRotating && !isResizing) return;
    const { clientX, clientY } = e;
    const rect = roomContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + (rect.width * selectedItem.x / 100);
    const centerY = rect.top + (rect.height * selectedItem.y / 100);

    if (isDragging) {
      const { x, y } = screenToRoomPercent(clientX, clientY);
      setSelectedItem({ ...selectedItem, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    } else if (isRotating) {
      const angle = Math.atan2(clientY - centerY, clientX - centerX);
      const rotation = angle * (180 / Math.PI);
      setSelectedItem({ ...selectedItem, rotation });
    } else if (isResizing) {
      const dx = clientX - dragStart.x;
      const dy = clientY - dragStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const direction = dx + dy > 0 ? 1 : -1;
      const newScale = Math.max(0.5, Math.min(2, initialTransform.scale + (direction * distance / 200)));
      setSelectedItem({ ...selectedItem, scale: newScale });
    }
  };

  // Handle pointer up
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsRotating(false);
    setIsResizing(false);
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Handle inventory item selection
  const handleInventoryItemClick = (item: DecorationInventoryItem) => {
    if (item.type !== 'furniture') {
      setRoomLayer(item.type, item.src);
      return;
    }
    const newItem: FurnitureItem = { id: `furniture-${Date.now()}`, src: item.src, x: 50, y: 50, width: 100, height: 100, scale: 1, rotation: 0, zIndex: 10, zone: 'WALL' };
    setSelectedItem(newItem);
    setShowInventory(false);
  };

  // Save furniture placement
  const handleSavePlacement = () => {
    if (!selectedItem) return;
    const zone = selectedItem.y >= ROOM_ZONES.FLOOR.startY ? 'FLOOR' : selectedItem.y <= ROOM_ZONES.CEILING.endY ? 'CEILING' : 'WALL';
    const itemToSave: RoomDecorItem = { src: selectedItem.src, x: selectedItem.x, y: selectedItem.y, width: selectedItem.width * selectedItem.scale, height: selectedItem.height * selectedItem.scale, rotation: selectedItem.rotation, zone };
    addDecorItem(itemToSave, 'front');
    setSelectedItem(null);
    setShowInventory(true);
  };

  if (!isOpen) return null;

  return (
    <div className="room-editor">
      <div className="room-editor-header">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Room Editor</h2>
        <div className="editor-controls">
          <button className={`control-button ${editMode === 'move' ? 'active' : ''}`} onClick={() => setEditMode('move')}>Move</button>
          <button className={`control-button ${editMode === 'rotate' ? 'active' : ''}`} onClick={() => setEditMode('rotate')}>Rotate</button>
          <button className={`control-button ${editMode === 'resize' ? 'active' : ''}`} onClick={() => setEditMode('resize')}>Resize</button>
        </div>
      </div>

      <div className="room-editor-content">
        <div className="room-preview" ref={roomContainerRef} style={{
          backgroundImage: `url(${roomLayers.ceiling}), url(${roomLayers.wall}), url(${roomLayers.floor})`
        }}>
          {/* Room zones */}
          <div className="room-zones">
            <div className="zone ceiling"></div>
            <div className="zone wall"></div>
            <div className="zone floor"></div>
          </div>

          {/* Placed furniture */}
          {roomLayers.frontDecor?.map((item: RoomDecorItem, index: number) => (
            <div key={`furniture-${index}`} className="placed-furniture" style={{
              left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}px`, height: `${item.height}px`, transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`, zIndex: 10 + index
            }}>
              <img src={item.src} alt="" draggable={false} />
            </div>
          ))}

          {/* Selected item */}
          {selectedItem && (
            <div ref={selectedItemRef} className={`selected-furniture ${isDragging ? 'dragging' : ''} ${isRotating ? 'rotating' : ''} ${isResizing ? 'resizing' : ''}`} style={{
              left: `${selectedItem.x}%`, top: `${selectedItem.y}%`, width: `${selectedItem.width * selectedItem.scale}px`, height: `${selectedItem.height * selectedItem.scale}px`, transform: `translate(-50%, -50%) rotate(${selectedItem.rotation || 0}deg)`, zIndex: 1000
            }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
              <img src={selectedItem.src} alt="" draggable={false} />
              <div className="furniture-controls"><div className="rotate-handle" /><div className="resize-handle" /></div>
            </div>
          )}
        </div>

        {/* Inventory panel */}
        {showInventory && (
          <div className="inventory-panel">
            <div className="category-tabs">
              <button className={activeCategory === 'furniture' ? 'active' : ''} onClick={() => setActiveCategory('furniture')}>Furniture</button>
              <button className={activeCategory === 'wall' ? 'active' : ''} onClick={() => setActiveCategory('wall')}>Walls</button>
              <button className={activeCategory === 'floor' ? 'active' : ''} onClick={() => setActiveCategory('floor')}>Floors</button>
              <button className={activeCategory === 'ceiling' ? 'active' : ''} onClick={() => setActiveCategory('ceiling')}>Ceilings</button>
            </div>
            <div className="inventory-items">
              {availableItems.map((item) => (
                <div key={item.src} className="inventory-item" onClick={() => handleInventoryItemClick(item)}>
                  <img src={item.src} alt={item.name} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {selectedItem && (
          <div className="action-buttons">
            <button onClick={() => { setSelectedItem(null); setShowInventory(true); }}>Cancel</button>
            <button onClick={handleSavePlacement}>Place</button>
          </div>
        )}
      </div>
    </div>
  );
} 