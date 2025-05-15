// src/contexts/InventoryContext.tsx
import { createContext, useState, useEffect, type ReactNode, useContext } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type {
  InventoryItem,
  DecorationInventoryItem,
  FoodInventoryItem,
  GroomingInventoryItem, // MODIFIED: Was CleaningInventoryItem
  ToyInventoryItem,
  RoomDecorItem,
  // FoodCategory, // REMOVED: Not directly used in this file
  // GroomingCategory, // REMOVED: Not directly used in this file
} from "../types"; // FoodCategory and GroomingCategory are used via the item types

export type DecorItem = RoomDecorItem;

type RoomLayers = {
  floor: string;
  wall: string;
  ceiling: string;
  backDecor: RoomDecorItem[];
  frontDecor: RoomDecorItem[];
  overlay: string;
};

const defaultDecorationItems: DecorationInventoryItem[] = [
  // Classic Theme
  { id: "deco-classic-floor", name: "Classic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/classic-floor.png" },
  { id: "deco-classic-wall", name: "Classic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/classic-wall.png" },
  { id: "deco-classic-ceiling", name: "Classic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/classic-ceiling.png" },

  // Science Lab Theme
  { id: "deco-science-floor", name: "Science Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/science-floor.png" },
  { id: "deco-science-wall", name: "Science Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/science-wall.png" },
  { id: "deco-science-ceiling", name: "Science Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/science-ceiling.png" },

  // Aero Theme
  { id: "deco-aero-floor", name: "Aero Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/aero-floor.png" },
  { id: "deco-aero-wall", name: "Aero Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/aero-wall.png" },
  { id: "deco-aero-ceiling", name: "Aero Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/aero-ceiling.png" },

  // Candy Theme
  { id: "deco-candy-floor", name: "Candy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/candy-floor.png" },
  { id: "deco-candy-wall", name: "Candy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/candy-wall.png" },
  { id: "deco-candy-ceiling", name: "Candy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/candy-ceiling.png" },

  // Krazy Theme
  { id: "deco-krazy-floor", name: "Krazy Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/krazy-floor.png" },
  { id: "deco-krazy-wall", name: "Krazy Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/krazy-wall.png" },
  { id: "deco-krazy-ceiling", name: "Krazy Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/krazy-ceiling.png" },

  // Example Decor Items
  { id: "deco-plant-1", name: "Potted Plant", itemCategory: "decoration", type: "backDecor", src: "/assets/decor/plant_1.png", description: "A lovely green plant." },
  { id: "deco-lamp-1", name: "Floor Lamp", itemCategory: "decoration", type: "frontDecor", src: "/assets/decor/lamp_1.png", description: "Lights up the room." },

  // Example Overlay
  { id: "deco-rainy-overlay", name: "Rainy Window", itemCategory: "decoration", type: "overlay", src: "/assets/overlays/rainy_window.png", description: "A cozy rainy day view."}
];

const defaultFoodItems: FoodInventoryItem[] = [
    { id: "food-kefir-lightmeal", name: "Kefir", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-dairy-lightmeal-kefir.png", description: "A fermented milk drink." },
    { id: "food-milk-lightmeal", name: "Milk", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-dairy-lightmeal-milk.png", description: "A refreshing glass of milk." },
    { id: "food-cheese-snack", name: "Cheese Slice", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-cheese.png", description: "A tasty slice of cheese." },
    { id: "food-cottagecheese-snack", name: "Cottage Cheese", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-cottagecheese.png", description: "Creamy cottage cheese." },
    { id: "food-whey-snack", name: "Whey Drink", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-whey.png", description: "A protein-rich whey drink." },
    { id: "food-yogurt-snack", name: "Yogurt Cup", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-yogurt.png", description: "A cup of creamy yogurt." },
    { id: "food-juice-lightmeal", name: "Orange Juice", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-drink-lightmeal-juice.png", description: "Fresh orange juice." },
    { id: "food-soda-lightmeal", name: "Soda Pop", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-drink-lightmeal-soda.png", description: "A fizzy soda pop." },
    { id: "food-tea-treat", name: "Cup of Tea", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-drink-treat-tea.png", description: "A warm cup of tea." },
    { id: "food-watermelonsalad-feast", name: "Watermelon Salad", itemCategory: "food", type: "Feast", hungerRestored: 60, src: "/assets/food/food-fruit-feast-watermelonsalad.png", description: "A refreshing watermelon salad." },
    { id: "food-applespb-lightmeal", name: "Apple Slices & PB", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-fruit-lightmeal-applesliceswithpeanutbutter.png", description: "Apple slices with peanut butter." },
    { id: "food-peachcobbler-lightmeal", name: "Peach Cobbler", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-fruit-lightmeal-peachcobbler.png", description: "Warm peach cobbler." },
    { id: "food-granolabar-lightmeal", name: "Granola Bar", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-snacks-lightmeal-granolabar.png", description: "A chewy granola bar." },
    { id: "food-chips-snack", name: "Potato Chips", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-chips.png", description: "Crispy potato chips." },
    { id: "food-pretzels-snack", name: "Pretzels", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-pretzels.png", description: "Salty pretzels." },
    { id: "food-exotic-heartymeal-wobblefruitstew", name: "Wobblefruit Stew", itemCategory: "food", type: "HeartyMeal", hungerRestored: 45, src: "/assets/food/food-exotic-heartymeal-wobblefruitstew.png", description: "A hearty exotic stew." },
    { id: "food-exotic-lightmeal-glorpberrysoup", name: "Glorpberry Soup", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-exotic-lightmeal-glorpberrysoup.png", description: "A light soup of glorpberries." },
    { id: "food-exotic-lightmeal-plasmaberrypie", name: "Plasmaberry Pie", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-exotic-lightmeal-plasmaberrypie.png", description: "A sweet and tangy pie." },
    { id: "food-exotic-treat-fizzmelon", name: "Fizzmelon", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-exotic-treat-fizzmelon.png", description: "A fizzy, refreshing melon." },
    { id: "food-exotic-treat-jibbleroot", name: "Jibbleroot", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-exotic-treat-jibbleroot.png", description: "A crunchy exotic root." },
    { id: "food-exotic-treat-snorpfruit", name: "Snorpfruit", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-exotic-treat-snorpfruit.png", description: "A peculiar but tasty fruit." },
    { id: "food-fruit-treat-blueberries", name: "Blueberries", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-fruit-treat-blueberries.png", description: "A handful of fresh blueberries." },
    { id: "food-fruit-treat-strawberry", name: "Strawberry", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-fruit-treat-strawberry.png", description: "A juicy red strawberry." },
    { id: "food-snacks-snack-popcorn", name: "Popcorn", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-popcorn.png", description: "A bowl of buttery popcorn." },
    { id: "food-snacks-snack-ricecake", name: "Rice Cake", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-ricecake.png", description: "A light and crispy rice cake." },
    { id: "food-snacks-treat-trailmix", name: "Trail Mix", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-snacks-treat-trailmix.png", description: "A mix of nuts and dried fruit." },
    { id: "food-sweets-treat-candy", name: "Candy", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-sweets-treat-candy.png", description: "A sweet piece of candy." },
    { id: "food-vegetables-heartymeal-broccolicasserole", name: "Broccoli Casserole", itemCategory: "food", type: "HeartyMeal", hungerRestored: 45, src: "/assets/food/food-vegetables-heartymeal-broccolicasserole.png", description: "A warm and cheesy casserole." },
    { id: "food-vegetables-lightmeal-cucumbersandwich", name: "Cucumber Sandwich", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-vegetables-lightmeal-cucumbersandwich.png", description: "A light and refreshing sandwich." },
    { id: "food-vegetables-treat-peas", name: "Peas", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-vegetables-treat-peas.png", description: "A small pod of peas." },
];

const defaultGroomingItems: GroomingInventoryItem[] = [
  { id: "grooming-dermal-basic-regularshampoo", name: "Regular Shampoo", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-dermal-basic-regularshampoo.png", description: "A gentle regular shampoo." },
  { id: "grooming-dermal-luxury-velvetcoatconditioner", name: "Velvet Coat Conditioner", itemCategory: "grooming", type: "LuxurySpa", cleanlinessBoost: 30, src: "/assets/grooming/grooming-dermal-luxury-velvetcoatconditioner.png", description: "For a luxurious, velvety coat." },
  { id: "grooming-dermal-premium-coconutoillotion", name: "Coconut Oil Lotion", itemCategory: "grooming", type: "PremiumCare", cleanlinessBoost: 25, src: "/assets/grooming/grooming-dermal-premium-coconutoillotion.png", description: "Nourishing coconut oil lotion." },
  { id: "grooming-dermal-standard-aloeleafgel", name: "Aloe Leaf Gel", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-dermal-standard-aloeleafgel.png", description: "Soothing aloe vera gel." },
  { id: "grooming-general-basic-everydaygroomingglove", name: "Everyday Grooming Glove", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-general-basic-everydaygroomingglove.png", description: "For daily grooming and bonding." },
  { id: "grooming-general-quickfix-onthegokit", name: "On-the-Go Kit", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-general-quickfix-onthegokit.png", description: "Quick grooming essentials." },
  { id: "grooming-general-quickfix-quickcleanspritz", name: "Quick Clean Spritz", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-general-quickfix-quickcleanspritz.png", description: "A refreshing quick clean spritz." },
  { id: "grooming-general-standard-basicbathsponge", name: "Basic Bath Sponge", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-general-standard-basicbathsponge.png", description: "A simple sponge for bath time." },
];

const defaultToyItems: ToyInventoryItem[] = [
    { id: "toy-rubber-ball", name: "Rubber Ball", itemCategory: "toy", type: "ChewToy", happinessBoost: 10, src: "/assets/toys/rubber_ball.png", description: "A bouncy classic." },
    { id: "toy-teddy-bear", name: "Teddy Bear", itemCategory: "toy", type: "Plushie", happinessBoost: 15, src: "/assets/toys/teddy_bear.png", description: "Soft and cuddly." },
    { id: "toy-puzzle-box", name: "Puzzle Box", itemCategory: "toy", type: "PuzzleToy", happinessBoost: 20, src: "/assets/toys/puzzle_box.png", description: "Keeps the mind sharp." },
    { id: "toy-activity-tree", name: "Activity Tree", itemCategory: "toy", type: "ActivityCenter", happinessBoost: 25, src: "/assets/toys/cat_tree.png", description: "Hours of fun!" },
    { id: "toy-robot-mouse", name: "Robo-Mouse", itemCategory: "toy", type: "RoboticPal", happinessBoost: 30, src: "/assets/toys/robot_mouse.png", description: "An interactive friend!" },
];

const defaultAllItems: InventoryItem[] = [
    ...defaultDecorationItems,
    ...defaultFoodItems,
    ...defaultGroomingItems,
    ...defaultToyItems
];

const defaultRoomLayersData: RoomLayers = {
  floor: "/assets/floors/classic-floor.png",
  wall: "/assets/walls/classic-wall.png",
  ceiling: "/assets/ceilings/classic-ceiling.png",
  backDecor: [],
  frontDecor: [],
  overlay: "",
};

interface InventoryContextType {
  items: InventoryItem[];
  roomLayers: RoomLayers;
  roomLayersLoading: boolean;
  setRoomLayer: (type: "floor" | "wall" | "ceiling" | "overlay", src: string) => void;
  addDecorItem: (type: "backDecor" | "frontDecor", decor: RoomDecorItem) => void;
  consumeItem: (itemId: string) => void;
}

const InventoryContext = createContext<InventoryContextType>({
  items: defaultAllItems,
  roomLayers: defaultRoomLayersData,
  roomLayersLoading: true,
  setRoomLayer: () => { console.warn("setRoomLayer called on default context"); },
  addDecorItem: () => { console.warn("addDecorItem called on default context"); },
  consumeItem: (itemId: string) => { console.warn(`consumeItem(${itemId}) called on default context`); },
});

export const useInventory = () => useContext(InventoryContext);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultRoomLayersData);
  const [roomLayersLoading, setRoomLayersLoading] = useState<boolean>(true);

  useEffect(() => {
    setRoomLayersLoading(true);
    const roomRef = ref(db, "roomLayers/sharedRoom");
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        setRoomLayers({
          floor: firebaseData.floor || defaultRoomLayersData.floor,
          wall: firebaseData.wall || defaultRoomLayersData.wall,
          ceiling: firebaseData.ceiling || defaultRoomLayersData.ceiling,
          backDecor: Array.isArray(firebaseData.backDecor) ? firebaseData.backDecor : [],
          frontDecor: Array.isArray(firebaseData.frontDecor) ? firebaseData.frontDecor : [],
          overlay: firebaseData.overlay || defaultRoomLayersData.overlay,
        });
      } else {
        setRoomLayers(defaultRoomLayersData);
      }
      setRoomLayersLoading(false);
    }, (error) => {
      console.error("Error fetching roomLayers from Firebase:", error);
      setRoomLayers(defaultRoomLayersData);
      setRoomLayersLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveRoomToFirebase = (updatedLayers: RoomLayers) => {
    const roomRef = ref(db, "roomLayers/sharedRoom");
    set(roomRef, updatedLayers).catch(err => console.error("Failed to save room layers to Firebase:", err));
  };

  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "overlay", src: string) => {
    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const addDecorItem = (type: "backDecor" | "frontDecor", decor: RoomDecorItem) => {
    const updatedLayers = {
      ...roomLayers,
      [type]: [...(roomLayers[type] || []), decor],
    };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const consumeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    console.log(`Item ${itemId} consumed from local list.`);
  };

  return (
    <InventoryContext.Provider value={{
      items,
      roomLayers,
      roomLayersLoading,
      setRoomLayer,
      addDecorItem,
      consumeItem
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
