import { createContext, useState, useEffect, useRef, type ReactNode, useContext, useCallback } from "react";
import { db, waitForAuth } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type {
  DecorationInventoryItem,
  RoomDecorItem,
  DecorationItemType
} from "../types";
import { defaultDecorationItems } from "../data/decorations";

// Re-export for consistent usage across components
export type DecorItem = RoomDecorItem;

type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
  trim: string;
  // Split decor into front and back for positioning relative to pet
  frontDecor: RoomDecorItem[];
  backDecor: RoomDecorItem[];
  decor: RoomDecorItem[]; // Keep for backward compatibility
  overlay: string;
};

// Add export to defaultDecorationItems
export const defaultRoomLayersData: RoomLayers = {
  floor: "/assets/floors/classic-floor.png",
  wall: "/assets/walls/classic-wall.png",
  ceiling: "/assets/ceilings/classic-ceiling.png",
  trim: "",
  frontDecor: [], // New array for furniture in front of pet
  backDecor: [],  // New array for furniture behind pet
  decor: [],      // Keep for backward compatibility
  overlay: "",
};

// Image cache for decoration images
export const decorImageCache = new Map<string, HTMLImageElement>();
export const decorZoomStylesCache = new Map<string, React.CSSProperties>();

interface DecorationContextType {
  decorations: DecorationInventoryItem[];
  roomLayers: RoomLayers;
  roomLayersLoading: boolean;
  setRoomLayer: (type: "floor" | "wall" | "ceiling" | "trim" | "overlay", src: string) => void;
  addDecorItem: (item: RoomDecorItem, position?: "front" | "back") => void; // Updated signature
  removeDecorItem: (position: "front" | "back", index: number) => void; // New method
  updateDecorItem: (originalLayer: "front" | "back", originalIndex: number, newItem: RoomDecorItem, newLayer: "front" | "back") => void; // New method
  reorderDecorItem: (layer: "front" | "back", fromIndex: number, toIndex: number) => void; // Move within a layer
  getFilteredDecorations: (subCategory: DecorationItemType) => DecorationInventoryItem[];
}

const DecorationContext = createContext<DecorationContextType | null>(null);

export const useDecoration = () => {
  const context = useContext(DecorationContext);
  if (!context) {
    throw new Error("useDecoration must be used within a DecorationProvider");
  }
  return context;
};

const preloadImages = async (items: DecorationInventoryItem[]) => {
  const loadPromises = items.map(item => {
    return new Promise<void>((resolve) => {
      if (decorImageCache.has(item.src)) {
        resolve();
        return;
      }
      const img = new Image();
      img.src = item.src;
      decorImageCache.set(item.src, img);
      img.onload = () => resolve();
      img.onerror = () => {
        console.error(`Failed to load decoration image: ${item.src}`);
        resolve(); // Resolve anyway to prevent blocking
      };
    });
  });
  await Promise.all(loadPromises);
};

export function DecorationProvider({ children }: { children: ReactNode }) {
  const [decorations, setDecorations] = useState<DecorationInventoryItem[]>(defaultDecorationItems);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultRoomLayersData);
  const [roomLayersLoading, setRoomLayersLoading] = useState<boolean>(true);
  
  // Add flag to prevent Firebase override during local updates
  const [isLocalUpdate, setIsLocalUpdate] = useState<boolean>(false);
  
  // Add ref to track pending save timeout
  const saveTimeoutRef = useRef<number | null>(null);

  // Initialize the cache and load room data on first render
  useEffect(() => {
    const initializeCache = async () => {
      try {
        let timeoutTriggered = false;
        
        // Set a much shorter fallback timeout 
        const loadingTimeout = window.setTimeout(() => {
          timeoutTriggered = true;
          console.log("Room loading timeout - using cached/default data");
          setRoomLayers(defaultRoomLayersData);
          setRoomLayersLoading(false);
        }, 2000); // Reduced from 3 seconds to 2 seconds
        
        // Don't wait for Firebase authentication - make it non-blocking
        // Start auth in background while proceeding with data loading
        waitForAuth()?.catch((authError: unknown) => {
          console.warn("Authentication failed, continuing anyway:", authError);
        });
        
        // Preload only essential decoration images (reduce from 10 to 3)
        await preloadImages(defaultDecorationItems.slice(0, 3));
        
        // Load decorations from Firebase
        const decorationsRef = ref(db, "decorations");
        
        // Set defaults immediately
        setDecorations(defaultDecorationItems);
        
        onValue(decorationsRef, (snapshot) => {
          const decorationsData = snapshot.val() as DecorationInventoryItem[] | null;
          
          if (decorationsData && Array.isArray(decorationsData)) {
            // Make sure price property is correctly converted to number
            const fixedData = decorationsData.map(item => {
              if (item.price === undefined || item.price === null) {
                // Look up the default price from our hardcoded decorations
                const defaultItem = defaultDecorationItems.find(defaultItem => defaultItem.id === item.id);
                return {
                  ...item,
                  price: defaultItem?.price || 0
                };
              }
              return item;
            });
            setDecorations(fixedData);
          } else {
            // If no data in Firebase, use defaults immediately without saving
            setDecorations(defaultDecorationItems);
          }
        }, {
          onlyOnce: true // Only load once for faster initial load
        });
        
        // Load room configuration from Firebase - updated path to match firebase service
        const roomRef = ref(db, "roomLayers/sharedRoom");
        
        onValue(roomRef, (snapshot) => {
          window.clearTimeout(loadingTimeout); // Clear timeout since we got data
          const roomData = snapshot.val() as RoomLayers | null;
          
          // Don't override local state if we're in the middle of a local update
          if (isLocalUpdate) {
            console.log("Skipping Firebase update - local update in progress");
            return;
          }
          
          if (roomData) {
            // We have Firebase data - use it
            const cleanedRoomData = { ...roomData };
            
            // Handle legacy data structure - move items from decor to frontDecor if needed
            // Only do this if frontDecor or backDecor are missing or empty
            if (roomData.decor && roomData.decor.length > 0 && 
                (!roomData.frontDecor || roomData.frontDecor.length === 0) &&
                (!roomData.backDecor || roomData.backDecor.length === 0)) {
              
              // Separate items into front and back based on their position property
              const frontItems: RoomDecorItem[] = [];
              const backItems: RoomDecorItem[] = [];
              
              roomData.decor.forEach(item => {
                if (item.position === "back") {
                  backItems.push({...item});
                } else {
                  frontItems.push({...item});
                }
              });
              
              cleanedRoomData.frontDecor = frontItems;
              cleanedRoomData.backDecor = backItems;
            }
            
            // Ensure all arrays exist and are distinct arrays (not references)
            cleanedRoomData.frontDecor = Array.isArray(cleanedRoomData.frontDecor) 
              ? [...cleanedRoomData.frontDecor] 
              : [];
              
            cleanedRoomData.backDecor = Array.isArray(cleanedRoomData.backDecor) 
              ? [...cleanedRoomData.backDecor] 
              : [];
            
            // Regenerate the combined decor array from scratch to avoid duplicates
            cleanedRoomData.decor = [
              ...cleanedRoomData.backDecor, 
              ...cleanedRoomData.frontDecor
            ];
            
            setRoomLayers(cleanedRoomData);
            
            // If we fixed any issues, save the cleaned data back to Firebase
            if (JSON.stringify(roomData) !== JSON.stringify(cleanedRoomData)) {
              saveRoomToFirebase(cleanedRoomData);
            }
          } else if (!timeoutTriggered) {
            // Only use defaults if Firebase genuinely has no data AND timeout didn't already trigger
            setRoomLayers(defaultRoomLayersData);
          }
          setRoomLayersLoading(false);
        }, (error) => {
          window.clearTimeout(loadingTimeout);
          console.error("Firebase room data error:", error);
          // Use defaults on error to prevent infinite loading
          setRoomLayers(defaultRoomLayersData);
          setRoomLayersLoading(false);
        });
        
        // Continue preloading remaining decorations in the background
        window.setTimeout(() => {
          preloadImages(defaultDecorationItems.slice(3))
            .catch(err => console.error("Error preloading decoration images:", err));
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize decoration cache:", error);
        setRoomLayersLoading(false);
      }
    };
    
    void initializeCache();
  }, [isLocalUpdate]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveRoomToFirebase = (updatedLayers: RoomLayers) => {
    // Clear any pending save
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new debounced save
    saveTimeoutRef.current = window.setTimeout(() => {
      const roomRef = ref(db, "roomLayers/sharedRoom");
      set(roomRef, updatedLayers)
        .then(() => {
          console.log("Room saved to Firebase successfully");
          // Clear the local update flag after successful save
          setIsLocalUpdate(false);
        })
        .catch(error => {
          console.error("Error saving room configuration:", error);
          // Clear the local update flag even on error
          setIsLocalUpdate(false);
        });
    }, 300); // 300ms debounce to batch rapid changes
  };

  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "trim" | "overlay", src: string) => {
    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const addDecorItem = useCallback((item: RoomDecorItem, position: "front" | "back" = "front") => {
    // Ensure the position property is correctly set on the item
    const itemWithPosition = {
      ...item,
      position
    };
    
    console.log("addDecorItem called:", { item: itemWithPosition, position });
    
    // Set local update flag to prevent Firebase interference
    setIsLocalUpdate(true);
    
    setRoomLayers(prevLayers => {
      console.log("Before add - frontDecor count:", prevLayers.frontDecor.length, "backDecor count:", prevLayers.backDecor.length);
      
      // Update the appropriate array based on position
      const updatedLayers = { ...prevLayers };
      
      if (position === "front") {
        updatedLayers.frontDecor = [...updatedLayers.frontDecor, itemWithPosition];
      } else {
        updatedLayers.backDecor = [...updatedLayers.backDecor, itemWithPosition];
      }
      
      // Update the legacy decor array for backward compatibility
      updatedLayers.decor = [...updatedLayers.backDecor, ...updatedLayers.frontDecor];
      
      console.log("After add - frontDecor count:", updatedLayers.frontDecor.length, "backDecor count:", updatedLayers.backDecor.length);
      
      // Save to Firebase
      saveRoomToFirebase(updatedLayers);
      
      return updatedLayers;
    });
  }, []);

  const removeDecorItem = useCallback((position: "front" | "back", index: number) => {
    console.log("removeDecorItem called:", { position, index });
    
    // Set local update flag to prevent Firebase interference
    setIsLocalUpdate(true);
    
    setRoomLayers(prevLayers => {
      console.log("Before remove - frontDecor count:", prevLayers.frontDecor.length, "backDecor count:", prevLayers.backDecor.length);
      
      const updatedLayers = { ...prevLayers };
      
      if (position === "front") {
        const newFrontDecor = [...updatedLayers.frontDecor];
        if (index < newFrontDecor.length) {
          console.log("Removing item from front layer at index:", index);
          newFrontDecor.splice(index, 1);
          updatedLayers.frontDecor = newFrontDecor;
        }
      } else {
        const newBackDecor = [...updatedLayers.backDecor];
        if (index < newBackDecor.length) {
          console.log("Removing item from back layer at index:", index);
          newBackDecor.splice(index, 1); 
          updatedLayers.backDecor = newBackDecor;
        }
      }
      
      // Update the combined decor array
      updatedLayers.decor = [...updatedLayers.backDecor, ...updatedLayers.frontDecor];
      
      console.log("After remove - frontDecor count:", updatedLayers.frontDecor.length, "backDecor count:", updatedLayers.backDecor.length);
      
      // Save to Firebase
      saveRoomToFirebase(updatedLayers);
      
      return updatedLayers;
    });
  }, []);

  const updateDecorItem = useCallback((originalLayer: "front" | "back", originalIndex: number, newItem: RoomDecorItem, newLayer: "front" | "back") => {
    console.log("updateDecorItem called:", { originalLayer, originalIndex, newLayer, newItem });
    
    // Set local update flag to prevent Firebase interference
    setIsLocalUpdate(true);
    
    setRoomLayers(prevLayers => {
      console.log("Before update - frontDecor count:", prevLayers.frontDecor.length, "backDecor count:", prevLayers.backDecor.length);
      
      const updatedLayers = { ...prevLayers };
      
      // Remove from original layer
      if (originalLayer === "front") {
        const newFrontDecor = [...updatedLayers.frontDecor];
        if (originalIndex < newFrontDecor.length) {
          console.log("Removing item from front layer at index:", originalIndex);
          newFrontDecor.splice(originalIndex, 1);
          updatedLayers.frontDecor = newFrontDecor;
        }
      } else {
        const newBackDecor = [...updatedLayers.backDecor];
        if (originalIndex < newBackDecor.length) {
          console.log("Removing item from back layer at index:", originalIndex);
          newBackDecor.splice(originalIndex, 1);
          updatedLayers.backDecor = newBackDecor;
        }
      }
      
      // Add to new layer
      const itemWithPosition = { ...newItem, position: newLayer };
      if (newLayer === "front") {
        console.log("Adding item to front layer");
        updatedLayers.frontDecor = [...updatedLayers.frontDecor, itemWithPosition];
      } else {
        console.log("Adding item to back layer");
        updatedLayers.backDecor = [...updatedLayers.backDecor, itemWithPosition];
      }
      
      // Update the combined decor array
      updatedLayers.decor = [...updatedLayers.backDecor, ...updatedLayers.frontDecor];
      
      console.log("After update - frontDecor count:", updatedLayers.frontDecor.length, "backDecor count:", updatedLayers.backDecor.length);
      
      // Save to Firebase
      saveRoomToFirebase(updatedLayers);
      
      return updatedLayers;
    });
  }, []);

  const reorderDecorItem = useCallback((layer: "front" | "back", fromIndex: number, toIndex: number) => {
    setIsLocalUpdate(true);
    setRoomLayers(prevLayers => {
      const updated = { ...prevLayers };
      const list = layer === "front" ? [...updated.frontDecor] : [...updated.backDecor];
      if (fromIndex < 0 || fromIndex >= list.length) return prevLayers;
      const clampedTo = Math.max(0, Math.min(list.length - 1, toIndex));
      if (fromIndex === clampedTo) return prevLayers;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(clampedTo, 0, moved);
      if (layer === "front") updated.frontDecor = list; else updated.backDecor = list;
      updated.decor = [...updated.backDecor, ...updated.frontDecor];
      saveRoomToFirebase(updated);
      return updated;
    });
  }, []);

  const getFilteredDecorations = useCallback(
    (subCategory: DecorationItemType) => {
      console.log(`Getting filtered decorations for ${subCategory}`);
      console.log(`Total decorations: ${decorations.length}`);
      console.log(`Available categories:`, decorations.map(d => d.type));
      
      const filtered = decorations.filter(item => item.type === subCategory);
      console.log(`Found ${filtered.length} items for ${subCategory}:`, 
        filtered.length > 0 ? filtered.map(i => i.name) : 'None');
      
      return filtered;
    },
    [decorations]
  );

  return (
    <DecorationContext.Provider
      value={{
        decorations,
        roomLayers,
        roomLayersLoading,
        setRoomLayer,
        addDecorItem,
        removeDecorItem,
        updateDecorItem,
        reorderDecorItem,
        getFilteredDecorations,
      }}
    >
      {children}
    </DecorationContext.Provider>
  );
} 