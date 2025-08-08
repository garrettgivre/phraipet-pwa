import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDecoration } from '../contexts/DecorationContext';
import type { DecorationInventoryItem, RoomDecorItem, DecorationItemType } from '../types';
import './FurnitureEditOverlay.css';

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
  const { roomLayers, addDecorItem, removeDecorItem, getFilteredDecorations, setRoomLayer } = useDecoration();
  const roomContainerRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<DecorationItemType>('furniture');
  const [availableItems, setAvailableItems] = useState<DecorationInventoryItem[]>([]);
  const [mode, setMode] = useState<'browse' | 'place' | 'edit'>('browse');
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    src: string;
    x: number;
    y: number;
    size: number;
    rotation: number;
    layer: 'front' | 'back';
    existingIndex?: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialRotation, setInitialRotation] = useState(0);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  useEffect(() => {
    const items = getFilteredDecorations(activeCategory);
    setAvailableItems(items);
    if (activeCategory !== 'furniture') {
      setSelectedItem(null);
      setMode('browse');
    }
  }, [activeCategory, getFilteredDecorations, roomLayers]);

  useEffect(() => {
    if (!isOpen || !roomContainerRef.current) return;
    const updateDimensions = () => void roomContainerRef.current?.getBoundingClientRect();
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null);
      setMode('browse');
    }
  }, [isOpen]);

  const getScaledSize = useCallback((sizePercent: number) => {
    const baseMeasure = Math.min(
      roomContainerRef.current?.clientWidth || 0,
      roomContainerRef.current?.clientHeight || 0
    );
    const baseSize = baseMeasure;
    return (sizePercent / 100) * baseSize;
  }, []);

  const getRoomZone = (y: number): "FLOOR" | "WALL" | "CEILING" => {
    if (y >= ROOM_ZONES.FLOOR.startY) return "FLOOR";
    if (y <= ROOM_ZONES.CEILING.endY) return "CEILING";
    return "WALL";
  };

  const createUniqueId = () => `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const handleCategorySelect = (category: DecorationItemType) => {
    setActiveCategory(category);
    setSelectedItem(null);
    setMode('browse');
  };

  const handleInventoryItemClick = (item: DecorationInventoryItem) => {
    if (item.type !== 'furniture') {
      setRoomLayer(item.type, item.src);
      return;
    }
    setSelectedItem({ id: createUniqueId(), src: item.src, x: 50, y: 50, size: 100, rotation: 0, layer: 'back' });
    setMode('place');
  };

  const handlePlacedItemClick = (item: RoomDecorItem, layer: 'front' | 'back', index: number) => {
    if (isDragging || isRotating) return;
    setSelectedItem({ id: createUniqueId(), src: item.src, x: item.x, y: item.y, size: item.width ? (item.width / getScaledSize(100)) * 100 : 100, rotation: item.rotation || 0, layer, existingIndex: index });
    setMode('edit');
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!selectedItem || !roomContainerRef.current) return;
    const { clientX, clientY } = e;
    const rect = roomContainerRef.current.getBoundingClientRect();
    const itemCenterX = (selectedItem.x / 100) * rect.width + rect.left;
    const itemCenterY = (selectedItem.y / 100) * rect.height + rect.top;
    setDragOffset({ x: ((clientX - itemCenterX) / rect.width) * 100, y: ((clientY - itemCenterY) / rect.height) * 100 });
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleRotateStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedItem || !roomContainerRef.current) return;
    setIsRotating(true);
    const rect = roomContainerRef.current.getBoundingClientRect();
    const itemCenterX = (selectedItem.x / 100) * rect.width + rect.left;
    const itemCenterY = (selectedItem.y / 100) * rect.height + rect.top;
    const initialAngle = Math.atan2(e.clientY - itemCenterY, e.clientX - itemCenterX) * (180 / Math.PI);
    setInitialRotation(selectedItem.rotation - initialAngle);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && !isRotating) return;
    if (!selectedItem || !roomContainerRef.current) return;
    const { clientX, clientY } = e;
    const rect = roomContainerRef.current.getBoundingClientRect();
    if (isDragging) {
      const newX = ((clientX - rect.left) / rect.width) * 100 - dragOffset.x;
      const newY = ((clientY - rect.top) / rect.height) * 100 - dragOffset.y;
      const finalX = Math.max(5, Math.min(95, newX));
      const finalY = Math.max(5, Math.min(95, newY));
      setSelectedItem({ ...selectedItem, x: finalX, y: finalY });
    } else if (isRotating) {
      const itemCenterX = (selectedItem.x / 100) * rect.width + rect.left;
      const itemCenterY = (selectedItem.y / 100) * rect.height + rect.top;
      const currentAngle = Math.atan2(clientY - itemCenterY, clientX - itemCenterX) * (180 / Math.PI);
      let newRotation = (initialRotation + currentAngle) % 360;
      if (newRotation < 0) newRotation += 360;
      setSelectedItem({ ...selectedItem, rotation: newRotation });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsRotating(false);
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handleLayerToggle = () => { if (selectedItem) setSelectedItem({ ...selectedItem, layer: selectedItem.layer === 'front' ? 'back' : 'front' }); };
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (selectedItem) setSelectedItem({ ...selectedItem, size: parseInt(e.target.value, 10) }); };

  const handleSaveItem = () => {
    if (!selectedItem) return;
    if (selectedItem.existingIndex !== undefined) removeDecorItem(selectedItem.layer, selectedItem.existingIndex);
    const zone = getRoomZone(selectedItem.y);
    const actualSize = getScaledSize(selectedItem.size);
    const newItem: RoomDecorItem = { src: selectedItem.src, x: selectedItem.x, y: selectedItem.y, width: actualSize, height: actualSize, rotation: selectedItem.rotation, zone };
    addDecorItem(newItem, selectedItem.layer);
    setSelectedItem(null);
    setMode('browse');
  };

  const handleDeleteItem = () => { if (selectedItem && selectedItem.existingIndex !== undefined) { removeDecorItem(selectedItem.layer, selectedItem.existingIndex); setSelectedItem(null); setMode('browse'); } };
  const handleCancel = () => { setSelectedItem(null); setMode('browse'); };
  const togglePanel = () => { setIsPanelCollapsed(!isPanelCollapsed); };

  if (!isOpen) return null;

  const frontItems = roomLayers?.frontDecor || [];
  const backItems = roomLayers?.backDecor || [];

  const renderFurnitureItems = () => {
    if (activeCategory !== 'furniture') return null;
    return (
      <>
        {backItems.map((item, index) => {
          const isSelected = selectedItem?.existingIndex === index && selectedItem?.layer === 'back' && mode === 'edit';
          if (isSelected) return null;
          return (
            <div key={`back-${index}`} className="placed-item" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}px`, height: `${item.height}px`, transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`, zIndex: 10 + index }} onClick={() => handlePlacedItemClick(item, 'back', index)}>
              <img src={item.src} alt="" draggable="false" />
            </div>
          );
        })}
        {selectedItem && (
          <div className={`active-item ${isDragging ? 'dragging' : ''} ${isRotating ? 'rotating' : ''}`} style={{ left: `${selectedItem.x}%`, top: `${selectedItem.y}%`, width: `${getScaledSize(selectedItem.size)}px`, height: `${getScaledSize(selectedItem.size)}px`, transform: `translate(-50%, -50%) rotate(${selectedItem.rotation}deg)`, zIndex: 1000 }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
            <img src={selectedItem.src} alt="" draggable="false" />
            <div className="rotation-handle" onPointerDown={handleRotateStart} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}><div className="handle-icon">⟳</div></div>
          </div>
        )}
        {frontItems.map((item, index) => {
          const isSelected = selectedItem?.existingIndex === index && selectedItem?.layer === 'front' && mode === 'edit';
          if (isSelected) return null;
          return (
            <div key={`front-${index}`} className="placed-item" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}px`, height: `${item.height}px`, transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`, zIndex: 40 + index }} onClick={() => handlePlacedItemClick(item, 'front', index)}>
              <img src={item.src} alt="" draggable="false" />
            </div>
          );
        })}
      </>
    );
  };

  const rootVars: React.CSSProperties = {
    ['--floor-start' as unknown as keyof React.CSSProperties]: `${ROOM_ZONES.FLOOR.startY}%`,
    ['--wall-start' as unknown as keyof React.CSSProperties]: `${ROOM_ZONES.WALL.startY}%`,
    ['--ceiling-start' as unknown as keyof React.CSSProperties]: `${ROOM_ZONES.CEILING.startY}%`,
  };

  return (
    <div className="furniture-edit-overlay" style={rootVars}>
      <div className="furniture-edit-header">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>{mode === 'browse' ? 'Select Item' : (mode === 'place' ? 'Place Item' : 'Edit Item')}</h2>
        <div className="header-spacer"></div>
      </div>
      <div className="edit-workspace">
        <div className="room-preview-area" ref={roomContainerRef}>
          <div className="room-zones"><div className="zone ceiling"></div><div className="zone wall"></div><div className="zone floor"></div></div>
          {renderFurnitureItems()}
          <div className="placement-guides"><div className="center-point"></div><div className="grid-line horizontal"></div><div className="grid-line vertical"></div></div>
        </div>
        {mode === 'browse' ? (
          <div className="item-selection-panel">
            <div className="category-tabs">
              <button className={activeCategory === 'furniture' ? 'active' : ''} onClick={() => handleCategorySelect('furniture')}>Furniture</button>
              <button className={activeCategory === 'wall' ? 'active' : ''} onClick={() => handleCategorySelect('wall')}>Walls</button>
              <button className={activeCategory === 'floor' ? 'active' : ''} onClick={() => handleCategorySelect('floor')}>Floors</button>
              <button className={activeCategory === 'ceiling' ? 'active' : ''} onClick={() => handleCategorySelect('ceiling')}>Ceilings</button>
              <button className={activeCategory === 'trim' ? 'active' : ''} onClick={() => handleCategorySelect('trim')}>Trim</button>
            </div>
            <div className="items-grid">
              {availableItems.length > 0 ? (
                availableItems.map((item) => (
                  <div key={item.id} className="item-card" onClick={() => handleInventoryItemClick(item)}>
                    <div className="item-image"><img src={item.src} alt={item.name} /></div>
                    <div className="item-name">{item.name}</div>
                  </div>
                ))
              ) : (
                <div className="empty-message">No items available in this category</div>
              )}
            </div>
          </div>
        ) : (
          <div className={`item-edit-controls ${isPanelCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-handle" onClick={togglePanel}>{isPanelCollapsed ? '▲' : '▼'}</div>
            <div className="control-section">
              <div className="control-group">
                <label>Size <span className="value">{selectedItem?.size}%</span></label>
                <input type="range" min="50" max="150" value={selectedItem?.size || 100} onChange={handleSizeChange} />
              </div>
              <div className="control-group">
                <label>Position</label>
                <div className="position-display"><div>X: {selectedItem?.x.toFixed(1)}%</div><div>Y: {selectedItem?.y.toFixed(1)}%</div></div>
                <div className="position-hint">Drag the item to reposition it</div>
              </div>
              <div className="control-group">
                <label>Rotation <span className="value">{Math.round(selectedItem?.rotation || 0)}°</span></label>
                <div className="rotation-hint">Use the rotation handle to adjust the angle</div>
              </div>
              <div className="control-group">
                <label>Layer</label>
                <button className="layer-toggle" onClick={handleLayerToggle}>{selectedItem?.layer === 'back' ? 'Behind Pet' : 'In Front of Pet'}</button>
              </div>
            </div>
            <div className="action-buttons">
              <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
              {mode === 'edit' && (<button className="delete-btn" onClick={handleDeleteItem}>Delete</button>)}
              <button className="save-btn" onClick={handleSaveItem}>{mode === 'place' ? 'Place Item' : 'Save Changes'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 