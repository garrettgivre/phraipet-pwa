import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDecoration, decorImageCache, decorZoomStylesCache } from "../contexts/DecorationContext";
import type {
  DecorationInventoryItem,
  DecorationItemType,
  RoomDecorItem,
} from "../types";
import { calculateVisibleBounds } from "../utils/imageUtils";
import BackButton from "../components/BackButton";
import "./DecorationPage.css";

const decorationSubCategories: DecorationItemType[] = ["wall", "floor", "ceiling", "trim", "decor", "overlay"];

const capitalizeFirstLetter = (string: string) => {
  if (!string) return string;
  const specialCases: Record<string, string> = {
    backDecor: "Back Decor", 
    frontDecor: "Front Decor", 
    decor: "Decorations",
  };
  if (specialCases[string]) return specialCases[string];
  return string.charAt(0).toUpperCase() + string.slice(1);
};

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

export default function DecorationPage() {
  const { decorations, setRoomLayer, addDecorItem, getFilteredDecorations } = useDecoration();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState<DecorationItemType>("wall");
  const [activeColorOptions, setActiveColorOptions] = useState<{ id: string; options: { label: string; src: string }[] } | null>(null);

  // Preload essential decoration images on component mount
  useEffect(() => {
    const initialDecorations = getFilteredDecorations(selectedSubCategory);
    
    // Process items in batches to avoid blocking the UI
    const batchSize = 5;
    const totalItems = initialDecorations.length;
    
    const processBatch = async (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, totalItems);
      const containerSize = 64; // Match the size used in ZoomedImage
      
      for (let i = startIndex; i < endIndex; i++) {
        const item = initialDecorations[i];
        // Skip if already cached
        if (decorZoomStylesCache.has(item.src)) continue;
        
        try {
          // Load the image if not already loaded
          if (!decorImageCache.has(item.src)) {
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.src = item.src;
              img.crossOrigin = "anonymous";
              decorImageCache.set(item.src, img);
              img.onload = () => resolve();
              img.onerror = () => reject(new Error(`Failed to load image: ${item.src}`));
            });
          }
          
          // Calculate bounds and create zoom style
          const bounds = await calculateVisibleBounds(item.src);
          
          // Skip invalid bounds
          if (bounds.width <= 0 || bounds.height <= 0 || 
              bounds.naturalWidth <= 0 || bounds.naturalHeight <= 0) {
            continue;
          }
          
          // Calculate the zoom style
          const scale = Math.min(
            containerSize / bounds.width,
            containerSize / bounds.height
          );
          
          const scaledNaturalWidth = bounds.naturalWidth * scale;
          const scaledNaturalHeight = bounds.naturalHeight * scale;
          
          const offsetX = (containerSize - (bounds.width * scale)) / 2 - (bounds.x * scale);
          const offsetY = (containerSize - (bounds.height * scale)) / 2 - (bounds.y * scale);
          
          // Cache the calculated style
          const zoomedStyle: React.CSSProperties = {
            position: 'absolute' as 'absolute',
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            width: `${scaledNaturalWidth}px`,
            height: `${scaledNaturalHeight}px`,
            visibility: 'visible' as 'visible'
          };
          
          decorZoomStylesCache.set(item.src, zoomedStyle);
        } catch (err) {
          console.error(`Error precaching zoom style for ${item.src}:`, err);
        }
      }
      
      // Process next batch if there are more items
      if (endIndex < totalItems) {
        // Use setTimeout to avoid blocking the UI thread
        setTimeout(() => processBatch(endIndex), 10);
      }
    };
    
    // Start processing the first batch
    processBatch(0);
  }, [selectedSubCategory, getFilteredDecorations]);

  const handleSubCategoryChange = useCallback((category: DecorationItemType) => {
    setIsTransitioning(true);
    setSelectedSubCategory(category);
    setActiveColorOptions(null);
    // Use requestAnimationFrame to ensure state updates are processed before removing transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    });
  }, []);

  const applyDecorationItem = useCallback((item: DecorationInventoryItem, chosenSrc?: string) => {
    const srcToApply = chosenSrc || item.src;
    if (["floor", "wall", "ceiling", "overlay", "trim"].includes(item.type)) {
      setRoomLayer(item.type as "floor" | "wall" | "ceiling" | "trim" | "overlay", srcToApply);
    } else if (item.type === "decor") {
      const decorItem: RoomDecorItem = { src: srcToApply, x: 50, y: 50 };
      addDecorItem("decor", decorItem);
    }
    setActiveColorOptions(null);
    
    // Navigate to pet page after applying decoration to show the changes
    navigate('/');
  }, [setRoomLayer, addDecorItem, navigate]);

  const handleItemClick = useCallback((item: DecorationInventoryItem) => {
    if (item.colorOptions && item.colorOptions.length > 0) {
      setActiveColorOptions(prev => (prev?.id === item.id ? null : { id: item.id, options: item.colorOptions! }));
    } else {
      applyDecorationItem(item);
    }
  }, [applyDecorationItem]);

  const filteredDecorations = useMemo(() => 
    getFilteredDecorations(selectedSubCategory),
    [getFilteredDecorations, selectedSubCategory]
  );

  return (
    <div className="sq-decor-page-wrapper">
      <div className="sq-inventory-header">
        <h1 className="sq-decor-title-bar">Room Decorations</h1>
      </div>
      
      <div className="sq-decor-item-display-area">
        <div className={`sq-decor-item-grid ${isTransitioning ? 'transitioning' : ''}`}>
          {filteredDecorations.length > 0 ? (
            filteredDecorations.map(item => (
              <div
                key={item.id}
                className="sq-decor-item-slot"
                onClick={() => handleItemClick(item)}
                title={item.description || item.name}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(item);}}}
              >
                <ZoomedImage src={item.src} alt={item.name} />
                <div className="sq-decor-item-info">
                  <span className="sq-decor-item-name-text">{item.name}</span>
                </div>
                {activeColorOptions?.id === item.id && item.colorOptions && (
                  <div className="sq-decor-item-color-picker">
                    {item.colorOptions.map(option => (
                      <button
                        key={option.label}
                        className="sq-decor-color-option-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyDecorationItem(item, option.src);
                        }}
                        style={{ backgroundImage: `url(${option.src})` }}
                        title={option.label}
                        aria-label={`Select color: ${option.label}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="sq-decor-empty-message">No decorations in this category.</p>
          )}
        </div>
      </div>
      
      <div className="sq-decor-navigation-bars">
        <div className="sq-decor-sub-category-bar">
          {decorationSubCategories.map(categoryValue => (
            <button
              key={categoryValue}
              className={`sq-decor-tab-button ${selectedSubCategory === categoryValue ? "active" : ""}`}
              onClick={() => handleSubCategoryChange(categoryValue)}
            >
              {capitalizeFirstLetter(categoryValue)}
            </button>
          ))}
        </div>
      </div>
      
      <BackButton />
    </div>
  );
} 