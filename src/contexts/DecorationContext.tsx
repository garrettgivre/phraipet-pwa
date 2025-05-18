import { createContext, useState, useEffect, type ReactNode, useContext, useCallback } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type {
  DecorationInventoryItem,
  RoomDecorItem,
  DecorationItemType
} from "../types";

// Re-export for consistent usage across components
export type DecorItem = RoomDecorItem;

type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
  trim: string;
  decor: RoomDecorItem[];
  overlay: string;
};

const defaultDecorationItems: DecorationInventoryItem[] = [
  // Classic Theme
  { id: "deco-classic-floor", name: "Classic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/classic-floor.png", price: 100 },
  { id: "deco-classic-wall", name: "Classic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/classic-wall.png", price: 100 },
  { id: "deco-classic-ceiling", name: "Classic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png", price: 100 },

  // Science Lab Theme
  { id: "deco-science-floor", name: "Science Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/science-floor.png", price: 150 },
  { id: "deco-science-wall", name: "Science Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/science-wall.png", price: 150 },
  { id: "deco-science-ceiling", name: "Science Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/science-ceiling.png", price: 150 },

  // Aero Theme
  { id: "deco-aero-floor", name: "Aero Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/aero-floor.png", price: 200 },
  { id: "deco-aero-wall", name: "Aero Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/aero-wall.png", price: 200 },
  { id: "deco-aero-ceiling", name: "Aero Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/aero-ceiling.png", price: 200 },

  // Candy Theme
  { id: "deco-candy-floor", name: "Candy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/candy-floor.png", price: 180 },
  { id: "deco-candy-wall", name: "Candy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/candy-wall.png", price: 180 },
  { id: "deco-candy-ceiling", name: "Candy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/candy-ceiling.png", price: 180 },

  // Krazy Theme
  { id: "deco-krazy-floor", name: "Krazy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/krazy-floor.png", price: 250 },
  { id: "deco-krazy-wall", name: "Krazy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/krazy-wall.png", price: 250 },
  { id: "deco-krazy-ceiling", name: "Krazy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/krazy-ceiling.png", price: 250 },

  // Basic Theme
  { id: "deco-basic-floor", name: "Basic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/basic-floor.png", price: 50 },
  { id: "deco-basic-wall", name: "Basic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/basic-wall.png", price: 50 },
  { id: "deco-basic-ceiling", name: "Basic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/basic-ceilling.png", price: 50 },
  { id: "deco-basic-trim", name: "Basic Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/basic-trim.png", price: 30 },

  // Wacky Theme
  { id: "deco-wacky-floor", name: "Wacky Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/wacky-floor.png", price: 225 },
  { id: "deco-wacky-wall", name: "Wacky Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/wacky-wall.png", price: 225 },
  { id: "deco-wacky-ceiling", name: "Wacky Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/wacky-ceiling.png", price: 225 },
  { id: "deco-wacky-trim", name: "Wacky Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/wacky-trim.png", price: 125 },

  // Art Deco Theme
  { id: "deco-artdeco-floor", name: "Art Deco Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/artdeco-floor.png", price: 300 },
  { id: "deco-artdeco-wall", name: "Art Deco Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/artdeco-wall.png", price: 300 },
  { id: "deco-artdeco-ceiling", name: "Art Deco Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/artdeco-ceiling.png", price: 300 },
  { id: "deco-artdeco-trim", name: "Art Deco Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/artdeco-trim.png", price: 175 },
];

const defaultRoomLayersData: RoomLayers = {
  floor: "/assets/floors/classic-floor.png",
  wall: "/assets/walls/classic-wall.png",
  ceiling: "/assets/ceilings/classic-ceiling.png",
  trim: "",
  decor: [],
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
  addDecorItem: (type: "decor", decor: RoomDecorItem) => void;
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

  // Initialize the cache and load room data on first render
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Preload decoration images
        await preloadImages(defaultDecorationItems.slice(0, 10)); // Start with first 10 for quick loading
        
        // Load decorations from Firebase
        const decorationsRef = ref(db, "decorations");
        
        onValue(decorationsRef, (snapshot) => {
          const decorationsData = snapshot.val() as DecorationInventoryItem[] | null;
          console.log('Firebase decorations data:', decorationsData ? 
            `Found ${decorationsData.length} items. Sample price: ${decorationsData[0]?.price}, Price type: ${typeof decorationsData[0]?.price}` : 
            'No data');
            
          if (decorationsData) {
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
            console.log('Fixed decorations data with price preservation:', fixedData[0]);
          } else {
            // If no data in Firebase, set default and save to Firebase
            set(decorationsRef, defaultDecorationItems)
              .then(() => console.log("Default decorations saved to Firebase"))
              .catch(error => console.error("Error saving default decorations:", error));
            setDecorations(defaultDecorationItems);
          }
        }, {
          onlyOnce: false
        });
        
        // Load room configuration from Firebase - updated path to match firebase service
        const roomRef = ref(db, "roomLayers/sharedRoom");
        
        onValue(roomRef, (snapshot) => {
          const roomData = snapshot.val() as RoomLayers | null;
          if (roomData) {
            setRoomLayers(roomData);
          } else {
            // If no data in Firebase, set default and save to Firebase
            set(roomRef, defaultRoomLayersData)
              .then(() => console.log("Default room layers saved to Firebase"))
              .catch(error => console.error("Error saving default room layers:", error));
            setRoomLayers(defaultRoomLayersData);
          }
          setRoomLayersLoading(false);
        }, {
          onlyOnce: false // Continue listening for changes
        });
        
        // Continue preloading remaining decorations in the background
        setTimeout(() => {
          preloadImages(defaultDecorationItems.slice(10))
            .catch(err => console.error("Error preloading decoration images:", err));
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize decoration cache:", error);
        setRoomLayersLoading(false);
      }
    };
    
    initializeCache();
  }, []);

  const saveRoomToFirebase = (updatedLayers: RoomLayers) => {
    // Updated path to match firebase service
    const roomRef = ref(db, "roomLayers/sharedRoom");
    set(roomRef, updatedLayers)
      .catch(error => console.error("Error saving room configuration:", error));
  };

  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "trim" | "overlay", src: string) => {
    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const addDecorItem = (type: "decor", decor: RoomDecorItem) => {
    const updatedLayers = {
      ...roomLayers,
      decor: [...roomLayers.decor, decor]
    };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const getFilteredDecorations = useCallback(
    (subCategory: DecorationItemType) => {
      return decorations.filter(item => 
        item.type === subCategory
      );
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
        getFilteredDecorations,
      }}
    >
      {children}
    </DecorationContext.Provider>
  );
} 