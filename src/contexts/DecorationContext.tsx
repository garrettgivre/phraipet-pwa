import { createContext, useState, useEffect, useRef, type ReactNode, useContext, useCallback } from "react";
import { db, waitForAuth } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type {
  DecorationInventoryItem,
  RoomDecorItem,
  DecorationItemType,
  RoomId,
  RoomLayers,
  AllRoomsLayers
} from "../types";
import { defaultDecorationItems } from "../data/decorations";

// Re-export for consistent usage across components
export type DecorItem = RoomDecorItem;

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

export const DEFAULT_ROOM_CONFIGS: Record<RoomId, RoomLayers> = {
  "living-room": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/classic-floor.png",
    wall: "/assets/walls/classic-wall.png",
    ceiling: "/assets/ceilings/classic-ceiling.png",
  },
  "bathroom": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/stone-floor.png",
    wall: "/assets/walls/basic-wall-blue.png",
    ceiling: "/assets/ceilings/basic-ceiling-ash.png",
  },
  "bedroom": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/basic-floor-cherry.png",
    wall: "/assets/walls/basic-wall-pink.png",
    ceiling: "/assets/ceilings/basic-ceiling-birch.png",
  },
  "study": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/basic-floor-oak.png",
    wall: "/assets/walls/basic-wall-green.png",
    ceiling: "/assets/ceilings/basic-ceiling-oak.png",
  },
  "backyard": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/wacky-floor.png",
    wall: "/assets/walls/classic-wall-sunset.png",
    ceiling: "/assets/ceilings/classic-ceiling-ocean.png",
  },
  "frontyard": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/zany-floor.png",
    wall: "/assets/walls/classic-wall-ocean.png",
    ceiling: "/assets/ceilings/classic-ceiling-sunset.png",
  },
  "dining-room": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/basic-floor-mahogany.png",
    wall: "/assets/walls/basic-wall-orange.png",
    ceiling: "/assets/ceilings/basic-ceiling-mahogany.png",
  },
  "kitchen": {
    ...defaultRoomLayersData,
    floor: "/assets/floors/neosteel-floor.png",
    wall: "/assets/walls/basic-wall-yellow.png",
    ceiling: "/assets/ceilings/neosteel-ceiling.png",
  }
};

export const INITIAL_ROOMS: RoomId[] = [
  "living-room",
  "bathroom",
  "bedroom",
  "study",
  "backyard",
  "frontyard",
  "dining-room",
  "kitchen"
];

// Image cache for decoration images
export const decorImageCache = new Map<string, HTMLImageElement>();
export const decorZoomStylesCache = new Map<string, React.CSSProperties>();

interface DecorationContextType {
  decorations: DecorationInventoryItem[];
  roomLayers: RoomLayers;
  allRoomsLayers: AllRoomsLayers;
  currentRoomId: RoomId;
  setCurrentRoomId: (roomId: RoomId) => void;
  roomLayersLoading: boolean;
  setRoomLayer: (type: "floor" | "wall" | "ceiling" | "trim" | "overlay", src: string) => void;
  addDecorItem: (item: RoomDecorItem, position?: "front" | "back") => void; // Updated signature
  removeDecorItem: (position: "front" | "back", index: number) => void; // New method
  updateDecorItem: (originalLayer: "front" | "back", originalIndex: number, newItem: RoomDecorItem, newLayer: "front" | "back") => void; // New method
  reorderDecorItem: (layer: "front" | "back", fromIndex: number, toIndex: number) => void; // Move within a layer
  getFilteredDecorations: (subCategory: DecorationItemType) => DecorationInventoryItem[];
  resetDecorations: () => void;
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
  
  const [allRoomsLayers, setAllRoomsLayers] = useState<AllRoomsLayers>(() => {
    const initial: any = {};
    INITIAL_ROOMS.forEach(id => {
      initial[id] = DEFAULT_ROOM_CONFIGS[id] || { ...defaultRoomLayersData };
    });
    return initial;
  });
  
  const [currentRoomId, setCurrentRoomId] = useState<RoomId>("living-room");
  const [roomLayersLoading, setRoomLayersLoading] = useState<boolean>(true);
  
  // Helper to get current room layers
  const roomLayers = allRoomsLayers[currentRoomId] || defaultRoomLayersData;
  
  // Add flag to prevent Firebase override during local updates
  const [isLocalUpdate, setIsLocalUpdate] = useState<boolean>(false);
  
  // Add ref to track pending save timeout
  const saveTimeoutRef = useRef<number | null>(null);

  // Initialize the cache and load room data on first render
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Set a much shorter fallback timeout 
        const loadingTimeout = window.setTimeout(() => {
          if (import.meta.env.DEV) console.log("Room loading timeout - using cached/default data");
          setRoomLayersLoading(false);
        }, 2000); // Reduced from 3 seconds to 2 seconds
        
        // Don't wait for Firebase authentication - make it non-blocking
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
            // Ensure price property is correctly converted to number and sync with latest definitions
            const fixedData: DecorationInventoryItem[] = decorationsData.map(item => {
              const defaultItem = defaultDecorationItems.find(def => def.id === item.id);
              
              if (defaultItem) {
                return {
                  ...item,
                  src: defaultItem.src,
                  name: defaultItem.name,
                  colorOptions: (defaultItem as any).colorOptions,
                  price: defaultItem.price,
                  itemCategory: defaultItem.itemCategory,
                  type: defaultItem.type,
                  theme: defaultItem.theme,
                  furnitureType: defaultItem.furnitureType
                };
              }
              
              if (item.price === undefined || item.price === null) {
                return {
                  ...item,
                  price: 0
                } as DecorationInventoryItem;
              }
              return item as DecorationInventoryItem;
            });
            
            if (JSON.stringify(fixedData) !== JSON.stringify(decorationsData)) {
              if (import.meta.env.DEV) console.log("Syncing decorations with latest definitions...");
              set(decorationsRef, fixedData).catch(err => console.error("Error syncing decorations:", err));
            }

            setDecorations(fixedData);
          } else {
            setDecorations(defaultDecorationItems);
          }
        }, {
          onlyOnce: true
        });
        
        // Load all rooms configuration from Firebase
        const roomsRef = ref(db, "roomLayers/rooms");
        
        onValue(roomsRef, (snapshot) => {
          window.clearTimeout(loadingTimeout);
          const roomsData = snapshot.val() as AllRoomsLayers | null;
          
          if (isLocalUpdate) {
            if (import.meta.env.DEV) console.log("Skipping Firebase update - local update in progress");
            return;
          }
          
          if (roomsData) {
            // Merge with defaults to ensure all rooms exist
            const mergedRooms: AllRoomsLayers = { ...allRoomsLayers };
            
            Object.keys(roomsData).forEach(id => {
              const roomData = roomsData[id];
              if (!roomData) return;
              const cleanedRoomData = { ...roomData };
              
              // Legacy migration for each room
              if (roomData.decor && roomData.decor.length > 0 && 
                  (!roomData.frontDecor || roomData.frontDecor.length === 0) &&
                  (!roomData.backDecor || roomData.backDecor.length === 0)) {
                
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
              
              cleanedRoomData.frontDecor = Array.isArray(cleanedRoomData.frontDecor) 
                ? cleanedRoomData.frontDecor.filter(item => item !== null && item !== undefined)
                : [];
                
              cleanedRoomData.backDecor = Array.isArray(cleanedRoomData.backDecor) 
                ? cleanedRoomData.backDecor.filter(item => item !== null && item !== undefined)
                : [];
              
              cleanedRoomData.decor = [
                ...cleanedRoomData.backDecor, 
                ...cleanedRoomData.frontDecor
              ];
              
              // Ensure all required properties of RoomLayers are present
              const finalRoomData: RoomLayers = {
                floor: cleanedRoomData.floor || defaultRoomLayersData.floor,
                wall: cleanedRoomData.wall || defaultRoomLayersData.wall,
                ceiling: cleanedRoomData.ceiling || defaultRoomLayersData.ceiling,
                trim: cleanedRoomData.trim || defaultRoomLayersData.trim,
                frontDecor: cleanedRoomData.frontDecor,
                backDecor: cleanedRoomData.backDecor,
                decor: cleanedRoomData.decor,
                overlay: cleanedRoomData.overlay || defaultRoomLayersData.overlay,
              };
              
              mergedRooms[id] = finalRoomData;
            });
            
            setAllRoomsLayers(mergedRooms);
          } else {
            // Check for legacy sharedRoom if rooms is empty
            const legacyRoomRef = ref(db, "roomLayers/sharedRoom");
            onValue(legacyRoomRef, (legacySnapshot) => {
              const legacyData = legacySnapshot.val() as RoomLayers | null;
              if (legacyData) {
                setAllRoomsLayers(prev => ({
                  ...prev,
                  "living-room": legacyData
                }));
                // Optionally save to new location
                saveAllRoomsToFirebase({
                  ...allRoomsLayers,
                  "living-room": legacyData
                });
              }
            }, { onlyOnce: true });
          }
          setRoomLayersLoading(false);
        }, (error) => {
          window.clearTimeout(loadingTimeout);
          console.error("Firebase rooms data error:", error);
          setRoomLayersLoading(false);
        });
        
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

  const saveAllRoomsToFirebase = (updatedAllRooms: AllRoomsLayers) => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      const roomsRef = ref(db, "roomLayers/rooms");
      set(roomsRef, updatedAllRooms)
        .then(() => {
          if (import.meta.env.DEV) console.log("All rooms saved to Firebase successfully");
          setIsLocalUpdate(false);
        })
        .catch(error => {
          console.error("Error saving rooms configuration:", error);
          setIsLocalUpdate(false);
        });
    }, 300);
  };

  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "trim" | "overlay", src: string) => {
    const updatedRoom = { ...roomLayers, [type]: src };
    const updatedAllRooms = { ...allRoomsLayers, [currentRoomId]: updatedRoom };
    setAllRoomsLayers(updatedAllRooms);
    saveAllRoomsToFirebase(updatedAllRooms);
  };

  const addDecorItem = useCallback((item: RoomDecorItem, position: "front" | "back" = "front") => {
    const itemWithPosition = { ...item, position };
    setIsLocalUpdate(true);
    
    setAllRoomsLayers(prevAllRooms => {
      const currentRoom = prevAllRooms[currentRoomId] || { ...defaultRoomLayersData };
      const updatedRoom = { ...currentRoom };
      
      if (position === "front") {
        updatedRoom.frontDecor = [...updatedRoom.frontDecor, itemWithPosition];
      } else {
        updatedRoom.backDecor = [...updatedRoom.backDecor, itemWithPosition];
      }
      
      updatedRoom.decor = [...updatedRoom.backDecor, ...updatedRoom.frontDecor];
      
      const updatedAllRooms = { ...prevAllRooms, [currentRoomId]: updatedRoom };
      saveAllRoomsToFirebase(updatedAllRooms);
      return updatedAllRooms;
    });
  }, [currentRoomId, roomLayers]);

  const removeDecorItem = useCallback((position: "front" | "back", index: number) => {
    setIsLocalUpdate(true);
    
    setAllRoomsLayers(prevAllRooms => {
      const currentRoom = prevAllRooms[currentRoomId] || { ...defaultRoomLayersData };
      const updatedRoom = { ...currentRoom };
      
      if (position === "front") {
        const newFrontDecor = [...updatedRoom.frontDecor];
        if (index < newFrontDecor.length) {
          newFrontDecor.splice(index, 1);
          updatedRoom.frontDecor = newFrontDecor;
        }
      } else {
        const newBackDecor = [...updatedRoom.backDecor];
        if (index < newBackDecor.length) {
          newBackDecor.splice(index, 1); 
          updatedRoom.backDecor = newBackDecor;
        }
      }
      
      updatedRoom.decor = [...updatedRoom.backDecor, ...updatedRoom.frontDecor];
      
      const updatedAllRooms = { ...prevAllRooms, [currentRoomId]: updatedRoom };
      saveAllRoomsToFirebase(updatedAllRooms);
      return updatedAllRooms;
    });
  }, [currentRoomId, roomLayers]);

  const updateDecorItem = useCallback((originalLayer: "front" | "back", originalIndex: number, newItem: RoomDecorItem, newLayer: "front" | "back") => {
    setIsLocalUpdate(true);
    
    setAllRoomsLayers(prevAllRooms => {
      const currentRoom = prevAllRooms[currentRoomId] || { ...defaultRoomLayersData };
      const updatedRoom = { ...currentRoom };
      
      if (originalLayer !== newLayer) {
        if (originalLayer === "front") {
          const newFrontDecor = [...updatedRoom.frontDecor];
          if (originalIndex < newFrontDecor.length) {
            newFrontDecor.splice(originalIndex, 1);
            updatedRoom.frontDecor = newFrontDecor;
          }
        } else {
          const newBackDecor = [...updatedRoom.backDecor];
          if (originalIndex < newBackDecor.length) {
            newBackDecor.splice(originalIndex, 1);
            updatedRoom.backDecor = newBackDecor;
          }
        }
        
        const itemWithPosition = { ...newItem, position: newLayer };
        if (newLayer === "front") {
          updatedRoom.frontDecor = [...updatedRoom.frontDecor, itemWithPosition];
        } else {
          updatedRoom.backDecor = [...updatedRoom.backDecor, itemWithPosition];
        }
      } else {
        const itemWithPosition = { ...newItem, position: newLayer };
        if (newLayer === "front") {
          const newFrontDecor = [...updatedRoom.frontDecor];
          if (originalIndex < newFrontDecor.length) {
            newFrontDecor[originalIndex] = itemWithPosition;
            updatedRoom.frontDecor = newFrontDecor;
          }
        } else {
          const newBackDecor = [...updatedRoom.backDecor];
          if (originalIndex < newBackDecor.length) {
            newBackDecor[originalIndex] = itemWithPosition;
            updatedRoom.backDecor = newBackDecor;
          }
        }
      }
      
      updatedRoom.decor = [...updatedRoom.backDecor, ...updatedRoom.frontDecor];
      
      const updatedAllRooms = { ...prevAllRooms, [currentRoomId]: updatedRoom };
      saveAllRoomsToFirebase(updatedAllRooms);
      return updatedAllRooms;
    });
  }, [currentRoomId, roomLayers]);

  const reorderDecorItem = useCallback((layer: "front" | "back", fromIndex: number, toIndex: number) => {
    setIsLocalUpdate(true);
    setAllRoomsLayers(prevAllRooms => {
      const currentRoom = prevAllRooms[currentRoomId] || { ...defaultRoomLayersData };
      const updatedRoom = { ...currentRoom };
      const list = layer === "front" ? [...updatedRoom.frontDecor] : [...updatedRoom.backDecor];
      if (fromIndex < 0 || fromIndex >= list.length) return prevAllRooms;
      const clampedTo = Math.max(0, Math.min(list.length - 1, toIndex));
      if (fromIndex === clampedTo) return prevAllRooms;
      const [moved] = list.splice(fromIndex, 1);
      if (!moved) return prevAllRooms;
      list.splice(clampedTo, 0, moved);
      if (layer === "front") updatedRoom.frontDecor = list; else updatedRoom.backDecor = list;
      updatedRoom.decor = [...updatedRoom.backDecor, ...updatedRoom.frontDecor];
      
      const updatedAllRooms = { ...prevAllRooms, [currentRoomId]: updatedRoom };
      saveAllRoomsToFirebase(updatedAllRooms);
      return updatedAllRooms;
    });
  }, [currentRoomId, roomLayers]);

  const getFilteredDecorations = useCallback(
    (subCategory: DecorationItemType) => {
      const filtered = decorations.filter(item => item.type === subCategory);
      return filtered;
    },
    [decorations]
  );

  const resetDecorations = useCallback(() => {
    setDecorations(defaultDecorationItems);
    const decorationsRef = ref(db, "decorations");
    set(decorationsRef, defaultDecorationItems).catch(error => console.error("Error resetting decorations:", error));
  }, []);

  return (
    <DecorationContext.Provider
      value={{
        decorations,
        roomLayers,
        allRoomsLayers,
        currentRoomId,
        setCurrentRoomId,
        roomLayersLoading,
        setRoomLayer,
        addDecorItem,
        removeDecorItem,
        updateDecorItem,
        reorderDecorItem,
        getFilteredDecorations,
        resetDecorations,
      }}
    >
      {children}
    </DecorationContext.Provider>
  );
} 