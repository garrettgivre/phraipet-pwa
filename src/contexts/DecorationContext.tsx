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
  // Split decor into front and back for positioning relative to pet
  frontDecor: RoomDecorItem[];
  backDecor: RoomDecorItem[];
  decor: RoomDecorItem[]; // Keep for backward compatibility
  overlay: string;
};

// Add export to defaultDecorationItems
export const defaultDecorationItems: DecorationInventoryItem[] = [
  // Classic Theme
  { id: "deco-classic-floor", name: "Classic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/classic-floor.png", price: 100 },
  { id: "deco-classic-wall", name: "Classic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/classic-wall.png", price: 100 },
  { id: "deco-classic-ceiling", name: "Classic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png", price: 100 },

  // Neo Steel Theme
  { id: "deco-neosteel-floor", name: "Neo Steel Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/neosteel-floor.png", price: 280 },
  { id: "deco-neosteel-wall", name: "Neo Steel Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/neosteel-wall.png", price: 280 },
  { id: "deco-neosteel-ceiling", name: "Neo Steel Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/neosteel-ceiling.png", price: 280 },
  { id: "deco-neosteel-trim", name: "Neo Steel Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/neosteel-trim.png", price: 160 },

  // Science Lab Theme
  { id: "deco-science-floor", name: "Science Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/science-floor.png", price: 150 },
  { id: "deco-science-wall", name: "Science Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/science-wall.png", price: 150 },
  { id: "deco-science-ceiling", name: "Science Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/science-ceiling.png", price: 150 },

  // Aero Theme
  { id: "deco-aero-floor", name: "Aero Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/aero-floor.png", price: 200 },
  { id: "deco-aero-wall", name: "Aero Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/aero-wall.png", price: 200 },
  { id: "deco-aero-ceiling", name: "Aero Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/aero-ceiling.png", price: 200 },
  { id: "deco-aero-trim", name: "Aero Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/aero-trim.png", price: 100 },

  // Igloo Theme
  { id: "deco-igloo-floor", name: "Igloo Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/igloo-floor.png", price: 220 },
  { id: "deco-igloo-wall", name: "Igloo Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/igloo-wall.png", price: 220 },
  { id: "deco-igloo-ceiling", name: "Igloo Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/igloo-ceiling.png", price: 220 },
  { id: "deco-igloo-trim", name: "Igloo Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/igloo-trim.png", price: 120 },

  // Candy Theme
  { id: "deco-candy-floor", name: "Candy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/candy-floor.png", price: 180 },
  { id: "deco-candy-wall", name: "Candy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/candy-wall.png", price: 180 },
  { id: "deco-candy-ceiling", name: "Candy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/candy-ceiling.png", price: 180 },

  // Krazy Theme
  { id: "deco-krazy-floor", name: "Krazy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/krazy-floor.png", price: 250 },
  { id: "deco-krazy-wall", name: "Krazy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/krazy-wall.png", price: 250 },
  { id: "deco-krazy-ceiling", name: "Krazy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/krazy-ceiling.png", price: 250 },
  { id: "deco-krazy-trim", name: "Krazy Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/krazy-trim.png", price: 150 },

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

  // Tugi Theme
  { id: "deco-tugi-floor", name: "Tugi Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/tugi-floor.png", price: 275 },
  { id: "deco-tugi-wall", name: "Tugi Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/tugi-wall.png", price: 275 },
  { id: "deco-tugi-ceiling", name: "Tugi Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/tugi-ceiling.png", price: 275 },
  { id: "deco-tugi-trim", name: "Tugi Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/tugi-trim.png", price: 150 },

  // Zany Theme
  { id: "deco-zany-floor", name: "Zany Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/zany-floor.png", price: 290 },
  { id: "deco-zany-wall", name: "Zany Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/zany-wall.png", price: 290 },
  { id: "deco-zany-ceiling", name: "Zany Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/zany-ceiling.png", price: 290 },
  { id: "deco-zany-trim", name: "Zany Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/zany-trim.png", price: 165 },
  
  // Furniture Items - Basic
  { id: "deco-furniture-basic-armchair", name: "Basic Armchair", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-armchair.png", price: 120, description: "A comfortable armchair for your pet to lounge in." },
  { id: "deco-furniture-basic-endtable", name: "Basic End Table", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-endtable.png", price: 85, description: "A stylish end table for your pet's room." },
  { id: "deco-furniture-basic-plant", name: "Basic Plant", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-plant.png", price: 65, description: "A decorative plant that adds a touch of nature." },
  { id: "deco-furniture-basic-wallart", name: "Wall Art", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-basic-wallart.png", price: 90, description: "Beautiful wall art to brighten up the room." },
  
  // Furniture Items - Woodland
  { id: "deco-furniture-woodland-floorlamp", name: "Woodland Floor Lamp", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-woodland-floorlamp.png", price: 110, description: "A cozy floor lamp that adds warm lighting." },
  { id: "deco-furniture-woodland-shelf", name: "Woodland Shelf", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-woodland-shelf.png", price: 95, description: "A rustic shelf for displaying your pet's treasures." },
  
  // Furniture Items - Odd Collection
  { id: "deco-furniture-odd-plant", name: "Odd Plant", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-odd-plant.png", price: 75, description: "An unusual plant with a quirky appearance." },
  { id: "deco-furniture-odd-diningchair", name: "Odd Dining Chair", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-odd-diningchair.png", price: 95, description: "A uniquely designed chair for dining." },
  { id: "deco-furniture-odd-diningtable", name: "Odd Dining Table", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-odd-diningtable.png", price: 130, description: "A modern dining table with an unusual design." },
  { id: "deco-furniture-odd-sculpture", name: "Odd Sculpture", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-odd-sculpture.png", price: 150, description: "An abstract sculptural piece for art lovers." },
  { id: "deco-furniture-odd-tablelamp", name: "Odd Table Lamp", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-odd-tablelamp.png", price: 85, description: "A decorative table lamp with a peculiar design." },
  { id: "deco-furniture-odd-endtable", name: "Odd End Table", itemCategory: "decoration", type: "furniture", src: "/assets/furniture/furniture-odd-endtable.png", price: 90, description: "A contemporary end table with unusual proportions." },
];

const defaultRoomLayersData: RoomLayers = {
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
        
        // Log the default furniture items for debugging
        console.log("Default furniture items:", defaultDecorationItems.filter(item => item.type === "furniture"));
        
        // Load decorations from Firebase
        const decorationsRef = ref(db, "decorations");
        
        onValue(decorationsRef, (snapshot) => {
          const decorationsData = snapshot.val() as DecorationInventoryItem[] | null;
          console.log('Firebase decorations data:', decorationsData ? 
            `Found ${decorationsData.length} items. Sample price: ${decorationsData[0]?.price}, Price type: ${typeof decorationsData[0]?.price}` : 
            'No data');
            
          if (decorationsData) {
            // Check for furniture items in Firebase data
            const furnitureItems = decorationsData.filter(item => item.type === "furniture");
            console.log(`Found ${furnitureItems.length} furniture items in Firebase:`, 
              furnitureItems.length > 0 ? furnitureItems.map(i => i.name) : 'None');
            
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
            console.log("No decorations found in Firebase, saving defaults including furniture items");
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
            // Create a clean copy of the room data to avoid duplications
            const cleanedRoomData = { ...roomData };
            
            // Handle legacy data structure - move items from decor to frontDecor if needed
            // Only do this if frontDecor or backDecor are missing or empty
            if (roomData.decor && roomData.decor.length > 0 && 
                (!roomData.frontDecor || roomData.frontDecor.length === 0) &&
                (!roomData.backDecor || roomData.backDecor.length === 0)) {
              console.log("Converting legacy decor array to frontDecor/backDecor");
              
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
            
            console.log("Loaded room configuration:", {
              frontDecor: cleanedRoomData.frontDecor.length,
              backDecor: cleanedRoomData.backDecor.length,
              combined: cleanedRoomData.decor.length
            });
            
            setRoomLayers(cleanedRoomData);
            
            // If we fixed any issues, save the cleaned data back to Firebase
            if (JSON.stringify(roomData) !== JSON.stringify(cleanedRoomData)) {
              console.log("Fixed room data inconsistencies, saving back to Firebase");
              saveRoomToFirebase(cleanedRoomData);
            }
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

  const addDecorItem = useCallback((item: RoomDecorItem, position: "front" | "back" = "front") => {
    // Ensure the position property is correctly set on the item
    const itemWithPosition = {
      ...item,
      position
    };
    
    console.log("Adding decor item:", itemWithPosition, "to position:", position);
    
    // Update the appropriate array based on position
    const updatedLayers = { ...roomLayers };
    
    if (position === "front") {
      updatedLayers.frontDecor = [...updatedLayers.frontDecor, itemWithPosition];
      console.log("Updated frontDecor:", updatedLayers.frontDecor);
    } else {
      updatedLayers.backDecor = [...updatedLayers.backDecor, itemWithPosition];
      console.log("Updated backDecor:", updatedLayers.backDecor);
    }
    
    // Update the legacy decor array for backward compatibility
    // NOTE: We're explicitly NOT adding to both arrays, so we have to maintain this combined array
    updatedLayers.decor = [...updatedLayers.backDecor, ...updatedLayers.frontDecor];
    
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  }, [roomLayers]);

  const removeDecorItem = useCallback((position: "front" | "back", index: number) => {
    const updatedLayers = { ...roomLayers };
    
    if (position === "front") {
      const newFrontDecor = [...updatedLayers.frontDecor];
      newFrontDecor.splice(index, 1);
      updatedLayers.frontDecor = newFrontDecor;
    } else {
      const newBackDecor = [...updatedLayers.backDecor];
      newBackDecor.splice(index, 1);
      updatedLayers.backDecor = newBackDecor;
    }
    
    // Update the combined decor array
    updatedLayers.decor = [...updatedLayers.backDecor, ...updatedLayers.frontDecor];
    
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  }, [roomLayers]);

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
        getFilteredDecorations,
      }}
    >
      {children}
    </DecorationContext.Provider>
  );
} 