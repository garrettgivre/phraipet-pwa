import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDecoration, decorImageCache, decorZoomStylesCache, defaultDecorationItems } from "../contexts/DecorationContext";
import type {
  DecorationInventoryItem,
  DecorationItemType,
  RoomDecorItem,
} from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import BackButton from "../components/BackButton";
import PetRoom from "../components/PetRoom";
import "./DecorationPage.css";
import { db } from "../firebase";
import { ref, set } from "firebase/database";

// Add function to force update furniture items in Firebase
const forceUpdateFurnitureItems = async (decorations: DecorationInventoryItem[]) => {
  try {
    // First get the default items from hardcoded values
    const defaultFurnitureFromContext = getHardcodedFurnitureItems();
    console.log("Default furniture items:", defaultFurnitureFromContext);
    
    // Make sure we include all default decoration items as well
    // Filter out any item types that are both in the existing decorations and in the defaults
    // This ensures we keep user-purchased decorations but get the latest defaults too
    const existingItemTypes = new Set(decorations.map(item => item.id));
    const newDefaultItems = defaultDecorationItems.filter((item: DecorationInventoryItem) => !existingItemTypes.has(item.id));
    
    // Combine existing decorations with new default items and furniture items
    const updatedDecorations = [...decorations, ...newDefaultItems, ...defaultFurnitureFromContext];
    console.log("Updated decorations to save:", updatedDecorations);
    
    // Save to Firebase
    const decorationsRef = ref(db, "decorations");
    await set(decorationsRef, updatedDecorations);
    console.log("Force updated decorations in Firebase with furniture items and latest defaults");
    return true;
  } catch (error) {
    console.error("Error force updating decorations:", error);
    return false;
  }
};

// Function to get hardcoded furniture items
const getHardcodedFurnitureItems = (): DecorationInventoryItem[] => {
  return [
    { id: "deco-furniture-basic-armchair", name: "Basic Armchair", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-armchair.png", price: 120, description: "A comfortable armchair for your pet to lounge in." },
    { id: "deco-furniture-basic-endtable", name: "Basic End Table", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-endtable.png", price: 85, description: "A stylish end table for your pet's room." },
    { id: "deco-furniture-basic-plant", name: "Basic Plant", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-plant.png", price: 65, description: "A decorative plant that adds a touch of nature." },
    { id: "deco-furniture-basic-wallart", name: "Wall Art", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-wallart.png", price: 90, description: "Beautiful wall art to brighten up the room." },
    { id: "deco-furniture-woodland-floorlamp", name: "Woodland Floor Lamp", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-woodland-floorlamp.png", price: 110, description: "A cozy floor lamp that adds warm lighting." },
    { id: "deco-furniture-woodland-shelf", name: "Woodland Shelf", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-woodland-shelf.png", price: 95, description: "A rustic shelf for displaying your pet's treasures." },
  ];
};

const decorationSubCategories: DecorationItemType[] = ["wall", "floor", "ceiling", "trim", "furniture", "overlay"];

const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  const specialCases: Record<string, string> = {
    backDecor: "Back Decor", 
    frontDecor: "Front Decor", 
    furniture: "Furniture",
  };
  if (specialCases[string]) return specialCases[string];
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Import the ROOM_ZONES constant from PetRoom
const ROOM_ZONES = {
  FLOOR: { startY: 60, endY: 100 },     // Bottom 40% is floor
  WALL: { startY: 15, endY: 60 },       // Middle area is wall
  CEILING: { startY: 0, endY: 15 }      // Top 15% is ceiling
};

function FurniturePlacementOverlay({
  selectedItem,
  onClose,
  onPlaceFurniture,
  roomLayers,
  initialPosition
}: {
  selectedItem: DecorationInventoryItem | null;
  onClose: () => void;
  onPlaceFurniture: (item: RoomDecorItem, position: "front" | "back") => void;
  roomLayers: any;
  initialPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
    position: "front" | "back";
  } | null;
}) {
  const [position, setPosition] = useState<"front" | "back">(initialPosition?.position || "front");
  const [coords, setCoords] = useState({ 
    x: initialPosition?.x || 50, 
    y: initialPosition?.y || 50 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ 
    width: initialPosition?.width || 0, 
    height: initialPosition?.height || 0 
  });
  const [currentZone, setCurrentZone] = useState("WALL");
  
  // Size state
  const [size, setSize] = useState({ 
    width: initialPosition?.width || 120, 
    height: initialPosition?.height || 120 
  });
  const [sizePercentage, setSizePercentage] = useState(initialPosition ? 
    (initialPosition.width / 120) * 100 : 100);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Add useEffect to disable page zoom
  useEffect(() => {
    // Disable zoom on the page
    const disableZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    // Add event listener with passive: false to allow preventDefault
    document.addEventListener('touchmove', disableZoom, { passive: false });
    document.addEventListener('touchstart', disableZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', disableZoom);
      document.removeEventListener('touchstart', disableZoom);
    };
  }, []);
  
  // When image loads, record its natural dimensions
  useEffect(() => {
    if (selectedItem) {
      const img = new Image();
      img.src = selectedItem.src;
      img.onload = () => {
        const initialSize = initialPosition ? 
          { width: initialPosition.width, height: initialPosition.height } : 
          calculateProportionalSize(img.naturalWidth, img.naturalHeight, 120);
        
        setImageNaturalSize({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        
        setSize(initialSize);
        
        // Set size percentage
        setSizePercentage((initialSize.width / 120) * 100);
      };
    }
  }, [selectedItem, initialPosition]);

  // Helper function to calculate proportional size
  const calculateProportionalSize = (naturalWidth: number, naturalHeight: number, maxDimension: number) => {
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return { width: maxDimension, height: maxDimension };
    }
    
    if (naturalWidth >= naturalHeight) {
      // Width is the larger dimension
      return {
        width: maxDimension,
        height: (naturalHeight / naturalWidth) * maxDimension
      };
    } else {
      // Height is the larger dimension
      return {
        width: (naturalWidth / naturalHeight) * maxDimension,
        height: maxDimension
      };
    }
  };

  // Update the zone based on current y-coordinate
  useEffect(() => {
    let zone = "WALL";
    if (coords.y >= ROOM_ZONES.FLOOR.startY) {
      zone = "FLOOR";
    } else if (coords.y <= ROOM_ZONES.CEILING.endY) {
      zone = "CEILING";
    }
    setCurrentZone(zone);
  }, [coords.y]);

  // Handle size change from slider
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercentage = parseFloat(e.target.value);
    setSizePercentage(newPercentage);
    
    // Calculate new dimensions based on percentage (50% = 60px, 100% = 120px, 150% = 180px)
    const baseSize = 120; // Base size at 100%
    const newBaseSize = (newPercentage / 100) * baseSize;
    
    // Maintain aspect ratio
    const aspectRatio = imageNaturalSize.width / imageNaturalSize.height;
    
    let newWidth, newHeight;
    if (imageNaturalSize.width >= imageNaturalSize.height) {
      // Width is the larger dimension
      newWidth = newBaseSize;
      newHeight = newWidth / aspectRatio;
    } else {
      // Height is the larger dimension
      newHeight = newBaseSize;
      newWidth = newHeight * aspectRatio;
    }
    
    setSize({
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    
    // Get client coordinates based on event type
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setStartDragPos({ x: clientX, y: clientY });
    
    // Prevent default to avoid text selection during drag
    e.preventDefault();
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !overlayRef.current || !selectedItem) return;
      
      // Get client coordinates based on event type
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      // Calculate how much we've moved
      const deltaX = clientX - startDragPos.x;
      const deltaY = clientY - startDragPos.y;
      
      // Get overlay dimensions
      const overlayRect = overlayRef.current.getBoundingClientRect();
      
      // Update coordinates as percentage of container size
      setCoords(prev => ({
        x: Math.max(0, Math.min(100, prev.x + (deltaX / overlayRect.width) * 100)),
        y: Math.max(0, Math.min(100, prev.y + (deltaY / overlayRect.height) * 100)),
      }));
      
      // Update start position for next calculation
      setStartDragPos({ x: clientX, y: clientY });
    },
    [isDragging, startDragPos, selectedItem]
  );

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Set up event listeners for drag movement
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove]);

  // If no item is selected, don't render anything
  if (!selectedItem) return null;

  const handleConfirmPlacement = () => {
    if (!selectedItem) return;
    
    // Create room decor item from the selected furniture with coordinates
    // that will maintain relative positioning across devices
    const furnitureItem: RoomDecorItem = {
      src: selectedItem.src,
      x: coords.x,
      y: coords.y,
      width: size.width,
      height: size.height,
      position,
      zone: currentZone as "FLOOR" | "WALL" | "CEILING",
      // Add relativeTo properties if this item is placed near another
      relativeTo: findRelativePosition(coords.x, coords.y)
    };
    
    console.log("Placing furniture:", furnitureItem, "in position:", position, "zone:", currentZone);
    onPlaceFurniture(furnitureItem, position);
    onClose();
  };
  
  // Helper function to find if the new item is near an existing item
  // and should be positioned relative to it
  const findRelativePosition = (x: number, y: number) => {
    // Get items in the current position (front or back)
    const existingItems = position === "front" ? 
      roomLayers.frontDecor : roomLayers.backDecor;
    
    if (!existingItems || existingItems.length === 0) return null;
    
    // Check if the new item is close to any existing items
    const PROXIMITY_THRESHOLD = 15; // % distance to consider "close"
    
    for (const item of existingItems) {
      const distance = Math.sqrt(
        Math.pow(x - item.x, 2) + 
        Math.pow(y - item.y, 2)
      );
      
      if (distance < PROXIMITY_THRESHOLD) {
        return {
          itemSrc: item.src,
          offsetX: x - item.x,
          offsetY: y - item.y
        };
      }
    }
    
    return null;
  };

  return (
    <div className="furniture-placement-overlay" ref={overlayRef}>
      <div className="room-preview-container">
        <PetRoom
          floor={roomLayers.floor || "/assets/floors/classic-floor.png"}
          wall={roomLayers.wall || "/assets/walls/classic-wall.png"}
          ceiling={roomLayers.ceiling || "/assets/ceilings/classic-ceiling.png"}
          trim={roomLayers.trim || ""}
          frontDecor={roomLayers.frontDecor}
          backDecor={roomLayers.backDecor}
          overlay={roomLayers.overlay || ""}
          petImage="/pet/neutral.png"
          petPosition={50}
        />
      </div>

      <div className="furniture-placement-controls">
        <h3>Place Your Furniture</h3>
        
        <div className="placement-options">
          <div className="position-selector">
            <label>Position:</label>
            <div className="position-buttons">
              <button 
                className={position === "front" ? "active" : ""}
                onClick={() => setPosition("front")}
              >
                In Front of Pet
              </button>
              <button 
                className={position === "back" ? "active" : ""}
                onClick={() => setPosition("back")}
              >
                Behind Pet
              </button>
            </div>
          </div>
          
          <div className="placement-help-text">
            Drag to position, use size slider to resize, then tap "Place"
            <div className="zone-indicator">Current zone: {currentZone.toLowerCase()}</div>
          </div>
        </div>
        
        <div className="placement-actions">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="place-button" onClick={handleConfirmPlacement}>Place</button>
        </div>
      </div>
      
      <div 
        className={`furniture-preview ${isDragging ? 'dragging' : ''}`}
        style={{ 
          left: `${coords.x}%`, 
          top: `${coords.y}%`
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <img 
          ref={imgRef}
          src={selectedItem.src} 
          alt={selectedItem.name} 
          draggable="false"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`
          }}
        />
      </div>
      
      {/* Size slider at bottom of screen */}
      <div className="size-slider-container">
        <label>Size: {Math.round(sizePercentage)}%</label>
        <input 
          type="range" 
          min="50" 
          max="200" 
          step="1" 
          value={sizePercentage}
          onChange={handleSizeChange}
          className="size-slider"
        />
      </div>
    </div>
  );
}

function PlacedFurnitureList({
  furnitureItems,
  onRemove,
  onReplace
}: {
  furnitureItems: RoomDecorItem[];
  onRemove: (index: number) => void;
  onReplace: (index: number) => void;
}) {
  if (furnitureItems.length === 0) {
    return (
      <div className="placed-furniture-empty">
        <p>No furniture placed yet. Select items from the furniture tab to decorate your room.</p>
      </div>
    );
  }

  return (
    <div className="placed-furniture-list">
      <h3>Placed Furniture</h3>
      <div className="furniture-items">
        {furnitureItems.map((item, index) => (
          <div key={index} className="placed-furniture-item">
            <img src={item.src} alt={`Furniture ${index + 1}`} />
            <div className="placed-furniture-actions">
              <button 
                className="replace-furniture-button" 
                onClick={() => onReplace(index)}
                aria-label="Replace furniture"
                title="Replace furniture"
              >
                ↻
              </button>
              <button 
                className="remove-furniture-button" 
                onClick={() => onRemove(index)}
                aria-label="Remove furniture"
                title="Remove furniture"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ZoomedImage({ src, alt }: { src: string; alt: string }) {
  const containerSize = 64;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({
    visibility: 'hidden'
  });

  useEffect(() => {
    let isMounted = true;
    setLoaded(false);
    setError(false);
    setImageStyle(prev => ({ ...prev, visibility: 'hidden' }));

    // Function to handle complex loading with zoom
    const handleComplexLoading = async () => {
      if (!isMounted) return;
      
      // Check if we already have cached styles for this image
      if (decorZoomStylesCache.has(src)) {
        // Use cached styles
        setImageStyle(decorZoomStylesCache.get(src)!);
        setLoaded(true);
        return;
      }
      
      try {
        const bounds = await calculateVisibleBounds(src);
        
        if (!isMounted) return;
        
        // Ensure we have valid dimensions
        if (bounds.width <= 0 || bounds.height <= 0 || bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
          console.warn("Invalid bounds for image:", src, bounds);
          // Fall back to simple loading
          handleSimpleLoading();
          return;
        }
        
        // Calculate the scale to fit the visible part of the image
        const scale = Math.min(
          containerSize / bounds.width,
          containerSize / bounds.height
        );
        
        // Calculate the dimensions after scaling
        const scaledNaturalWidth = bounds.naturalWidth * scale;
        const scaledNaturalHeight = bounds.naturalHeight * scale;
        
        // Calculate offsets to center the visible part
        const offsetX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale);
        const offsetY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);
        
        // Create the style object
        const zoomedStyle: React.CSSProperties = {
          position: 'absolute' as 'absolute',
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          width: `${scaledNaturalWidth}px`,
          height: `${scaledNaturalHeight}px`,
          visibility: 'visible' as 'visible'
        };
        
        // Cache the calculated style for future use
        decorZoomStylesCache.set(src, zoomedStyle);
        
        setImageStyle(zoomedStyle);
        setLoaded(true);
      } catch (err) {
        console.error("Error calculating visible bounds:", err);
        // Fall back to simple loading on error
        if (isMounted) {
          handleSimpleLoading();
        }
      }
    };

    // Function to handle simple loading
    const handleSimpleLoading = () => {
      if (!isMounted) return;
      const simpleStyle: React.CSSProperties = {
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain' as 'contain',
        visibility: 'visible' as 'visible'
      };
      setImageStyle(simpleStyle);
      setLoaded(true);
    };

    // Check if image is already in cache
    if (decorImageCache.has(src)) {
      const cachedImg = decorImageCache.get(src)!;
      
      if (cachedImg.complete) {
        handleComplexLoading();
      } else {
        cachedImg.onload = () => {
          handleComplexLoading();
        };
        
        cachedImg.onerror = () => {
          if (!isMounted) return;
          console.error("Cached image error:", src);
          setError(true);
          setLoaded(true);
        };
      }
    } else {
      const img = new Image();
      img.src = src;
      img.crossOrigin = "anonymous";
      decorImageCache.set(src, img);

      img.onload = () => {
        handleComplexLoading();
      };

      img.onerror = () => {
        if (!isMounted) return;
        console.error("Failed to load image:", src);
        setError(true);
        setLoaded(true);
      };
    }

    return () => { isMounted = false; };
  }, [src, containerSize]);

  return (
    <div className="sq-decor-item-image-wrapper">
      {!loaded && <div className="sq-decor-item-placeholder-text">...</div>}
      {loaded && error && <div className="sq-decor-item-placeholder-text error">X</div>}
      {loaded && !error && (
        <img src={src} alt={alt} className="sq-decor-item-image-content" style={imageStyle} />
      )}
    </div>
  );
}

// Just after imports, add an interface for items with quantity
interface DecorationInventoryItemWithQuantity extends DecorationInventoryItem {
  quantity: number;
}

// Update the countItemQuantities function
const countItemQuantities = (items: DecorationInventoryItem[]): Map<string, number> => {
  const itemCounts = new Map<string, number>();
  
  items.forEach(item => {
    const currentCount = itemCounts.get(item.id) || 0;
    itemCounts.set(item.id, currentCount + 1);
  });
  
  return itemCounts;
};

export default function DecorationPage() {
  const { decorations, roomLayers, setRoomLayer, addDecorItem, removeDecorItem, getFilteredDecorations } = useDecoration();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState<DecorationItemType>("wall");
  const [activeColorOptions, setActiveColorOptions] = useState<{ id: string; options: { label: string; src: string }[] } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // New states for furniture placement
  const [selectedFurniture, setSelectedFurniture] = useState<DecorationInventoryItem | null>(null);
  const [showPlacementOverlay, setShowPlacementOverlay] = useState(false);
  const [showPlacedFurniture, setShowPlacedFurniture] = useState(false);
  const [replaceCoords, setReplaceCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    position: "front" | "back";
  } | null>(null);

  // Auto-refresh missing themes
  useEffect(() => {
    // Check if we need to refresh by looking for the new items
    const hasIglooTheme = decorations.some(item => item.id === "deco-igloo-floor");
    const hasKrazyTrim = decorations.some(item => item.id === "deco-krazy-trim");
    const hasAeroTrim = decorations.some(item => item.id === "deco-aero-trim");
    
    if (!hasIglooTheme || !hasKrazyTrim || !hasAeroTrim) {
      console.log("Missing new theme items, triggering auto-refresh");
      handleRefreshFurniture();
    }
  }, [decorations]);

  const handleSelectFurniture = (item: DecorationInventoryItem) => {
    // Only handle placement for furniture type
    if (item.type === "furniture") {
      setSelectedFurniture(item);
      setShowPlacementOverlay(true);
    } else {
      // For other types, just set the room layer directly
      setRoomLayer(item.type, item.src);
    }
  };

  const handlePlaceFurniture = (item: RoomDecorItem, position: "front" | "back") => {
    console.log("Handling furniture placement:", item, "position:", position);
    
    // Only add to the selected position (front or back)
    // Do not add to both layers - this was causing the issue
    addDecorItem(item, position);
    
    // Update local state to show the placed furniture panel
    setShowPlacedFurniture(true);
  };

  // Generate filtered items for the current category with counts for duplicates
  const filteredItems = useMemo(() => {
    const items = getFilteredDecorations(selectedSubCategory);
    console.log(`Filtered ${selectedSubCategory} items:`, items);
    
    // For furniture, we want to handle duplicates by showing counts
    if (selectedSubCategory === "furniture") {
      // Count occurrences of each item ID
      const itemCounts = countItemQuantities(items);
      
      // Create a deduplicated array with the first occurrence of each item
      const uniqueItems = Array.from(
        new Map(items.map(item => [item.id, item])).values()
      );
      
      // Add quantity property to each item
      return uniqueItems.map(item => ({
        ...item,
        quantity: itemCounts.get(item.id) || 1
      })) as DecorationInventoryItemWithQuantity[];
    }
    
    return items;
  }, [getFilteredDecorations, selectedSubCategory]);

  // Handle category changes
  const handleSubCategoryChange = (category: DecorationItemType) => {
    if (category === selectedSubCategory) return;
    
    setIsTransitioning(true);
    setSelectedSubCategory(category);
    
    // Reset selection state when changing categories
    setActiveColorOptions(null);
    
    // Short delay to allow transition to complete
    setTimeout(() => {
      setIsTransitioning(false);
    }, 150);
  };

  // Handle back button click
  const handleBackClick = () => {
    navigate("/");
  };

  // Add function to handle refresh with feedback
  const handleRefreshFurniture = async () => {
    console.log("Current decorations:", decorations);
    console.log("Furniture items:", decorations.filter(item => item.type === "furniture"));
    
    // Set a loading state
    setIsRefreshing(true);
    
    const success = await forceUpdateFurnitureItems(decorations);
    
    if (success) {
      // Force a reload of the current page to get updated data from Firebase
      window.location.reload();
    } else {
      alert("Failed to refresh furniture. Check console for details.");
      setIsRefreshing(false);
    }
  };

  // Add function to check if furniture items exist
  const furnitureItemsExist = useMemo(() => {
    const hasFurniture = decorations.some(item => item.type === "furniture");
    console.log("Furniture items existence check:", hasFurniture);
    return hasFurniture;
  }, [decorations]);

  // Add a new function to replace furniture
  const handleReplaceFurniture = (position: "front" | "back", index: number) => {
    // Get the item to be replaced
    const itemsArray = position === "front" ? roomLayers.frontDecor : roomLayers.backDecor;
    if (index < 0 || index >= itemsArray.length) return;
    
    const itemToReplace = itemsArray[index];
    
    // Remove the item first
    removeDecorItem(position, index);
    
    // Show the placement overlay with the item's original position
    setSelectedFurniture({
      // Find a matching item in decorations array
      ...decorations.find(item => item.src === itemToReplace.src) || {
        id: `temp-${Date.now()}`,
        name: "Furniture Item",
        itemCategory: "decoration",
        type: "furniture",
        src: itemToReplace.src,
        price: 0
      },
      // Add any missing properties
      id: `temp-${Date.now()}`,
      itemCategory: "decoration",
      type: "furniture",
    });
    
    // Set initial coords to the item's current position
    setReplaceCoords({
      x: itemToReplace.x,
      y: itemToReplace.y,
      width: itemToReplace.width || 0,
      height: itemToReplace.height || 0, 
      position: position
    });
    
    setShowPlacementOverlay(true);
  };

  return (
    <div className="sq-decor-page-wrapper">
      <div className="sq-decor-title-bar">
        {selectedSubCategory === "furniture" ? 
          "Furniture & Decorations" : 
          `${capitalizeFirstLetter(selectedSubCategory)} Decorations`}
      </div>
      
      {selectedSubCategory === "furniture" && (
        <div className="furniture-management-bar">
          <button 
            className={`furniture-view-toggle ${showPlacedFurniture ? 'active' : ''}`}
            onClick={() => setShowPlacedFurniture(!showPlacedFurniture)}
          >
            {showPlacedFurniture ? "Select Furniture" : "Manage Placed Furniture"}
          </button>
          
          {/* Temporary refresh button */}
          <button 
            className={`furniture-refresh-button ${!furnitureItemsExist ? 'important' : ''} ${isRefreshing ? 'loading' : ''}`}
            onClick={handleRefreshFurniture}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Loading...' : (!furnitureItemsExist ? 'Click to Load Furniture!' : 'Refresh Furniture')}
          </button>
        </div>
      )}
      
      {selectedSubCategory === "furniture" && !furnitureItemsExist && (
        <div className="furniture-missing-alert">
          <p>No furniture found! Click the red button above to load furniture items.</p>
        </div>
      )}
      
      <div className="sq-decor-item-display-area">
        {selectedSubCategory === "furniture" && showPlacedFurniture ? (
          <div className="placed-furniture-container">
            <h3>Front Items (Displayed in front of pet)</h3>
            <PlacedFurnitureList 
              furnitureItems={roomLayers.frontDecor} 
              onRemove={(index) => removeDecorItem("front", index)}
              onReplace={(index) => handleReplaceFurniture("front", index)}
            />
            
            <h3>Back Items (Displayed behind pet)</h3>
            <PlacedFurnitureList 
              furnitureItems={roomLayers.backDecor} 
              onRemove={(index) => removeDecorItem("back", index)}
              onReplace={(index) => handleReplaceFurniture("back", index)}
            />
          </div>
        ) : (
          <div className={`sq-decor-item-grid ${isTransitioning ? 'transitioning' : ''}`}>
            {filteredItems.length === 0 ? (
              <div className="sq-decor-empty-message">
                No {selectedSubCategory} items available
              </div>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.id}
                  className="sq-decor-item-slot"
                  onClick={() => handleSelectFurniture(item)}
                >
                  <ZoomedImage src={item.src} alt={item.name} />
                  <div className="sq-decor-item-info">
                    <span className="sq-decor-item-name-text">{item.name}</span>
                    <span className="sq-decor-item-price-text">{item.price} coins</span>
                    {/* Show quantity badge for furniture if more than 1 */}
                    {selectedSubCategory === "furniture" && 
                     'quantity' in item && 
                     (item as DecorationInventoryItemWithQuantity).quantity > 1 && (
                      <span className="sq-decor-item-quantity-badge">
                        x{(item as DecorationInventoryItemWithQuantity).quantity}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="sq-decor-navigation-bars">
        <div className="sq-decor-sub-category-bar">
          {decorationSubCategories.map(category => (
            <button
              key={category}
              className={`sq-decor-tab-button ${selectedSubCategory === category ? 'active' : ''}`}
              onClick={() => handleSubCategoryChange(category)}
            >
              {capitalizeFirstLetter(category)}
            </button>
          ))}
        </div>
      </div>
      
      <BackButton />
      
      {showPlacementOverlay && (
        <FurniturePlacementOverlay
          selectedItem={selectedFurniture}
          onClose={() => {
            setShowPlacementOverlay(false);
            setSelectedFurniture(null);
            setReplaceCoords(null); // Reset replace coords
          }}
          onPlaceFurniture={handlePlaceFurniture}
          roomLayers={roomLayers}
          initialPosition={replaceCoords}
        />
      )}
    </div>
  );
} 