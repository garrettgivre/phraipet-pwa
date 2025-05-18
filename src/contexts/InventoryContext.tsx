// src/contexts/InventoryContext.tsx
import { createContext, useState, useEffect, type ReactNode, useContext, useCallback } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type {
  InventoryItem,
  FoodInventoryItem,
  GroomingInventoryItem,
  ToyInventoryItem,
} from "../types";
import { enhanceFoodItemsWithDescriptions } from "../utils/foodUtils";

// Export the image cache for reuse in other components
export const imageCache = new Map<string, HTMLImageElement>();
export const zoomStylesCache = new Map<string, React.CSSProperties>();

// Define inventory-only food items
const defaultFoodItems: FoodInventoryItem[] = [
    { id: "food-kefir-lightmeal", name: "Kefir", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-dairy-lightmeal-kefir.png", description: "A fermented milk drink.", price: 25 },
    { id: "food-milk-lightmeal", name: "Milk", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-dairy-lightmeal-milk.png", description: "A refreshing glass of milk.", price: 20 },
    { id: "food-cheese-snack", name: "Cheese", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-cheese.png", description: "A tasty slice of cheese.", price: 15 },
    { id: "food-cottagecheese-snack", name: "Cottage Cheese", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-cottagecheese.png", description: "Creamy cottage cheese.", price: 15 },
    { id: "food-whey-snack", name: "Whey", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-whey.png", description: "A protein-rich whey drink.", price: 18 },
    { id: "food-yogurt-snack", name: "Yogurt", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-dairy-snack-yogurt.png", description: "A cup of creamy yogurt.", price: 15 },
    { id: "food-juice-lightmeal", name: "Juice", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-drink-lightmeal-juice.png", description: "Fresh orange juice.", price: 22 },
    { id: "food-soda-lightmeal", name: "Soda", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-drink-lightmeal-soda.png", description: "A fizzy soda pop.", price: 20 },
    { id: "food-tea-treat", name: "Tea", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-drink-treat-tea.png", description: "A warm cup of tea.", price: 10 },
    { id: "food-watermelonsalad-feast", name: "Watermelon Salad", itemCategory: "food", type: "Feast", hungerRestored: 60, src: "/assets/food/food-fruit-feast-watermelonsalad.png", description: "A refreshing watermelon salad.", price: 45 },
    { id: "food-applespb-lightmeal", name: "Apple Slices with Peanut Butter", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-fruit-lightmeal-applesliceswithpeanutbutter.png", description: "Apple slices with peanut butter.", price: 25 },
    { id: "food-peachcobbler-lightmeal", name: "Peach Cobbler", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-fruit-lightmeal-peachcobbler.png", description: "Warm peach cobbler.", price: 28 },
    { id: "food-granolabar-lightmeal", name: "Granola Bar", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-snacks-lightmeal-granolabar.png", description: "A chewy granola bar.", price: 22 },
    { id: "food-chips-snack", name: "Chips", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-chips.png", description: "Crispy potato chips.", price: 12 },
    { id: "food-pretzels-snack", name: "Pretzels", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-pretzels.png", description: "Salty pretzels.", price: 12 },
    { id: "food-exotic-heartymeal-wobblefruitstew", name: "Wobblefruit Stew", itemCategory: "food", type: "HeartyMeal", hungerRestored: 45, src: "/assets/food/food-exotic-heartymeal-wobblefruitstew.png", description: "A hearty exotic stew.", price: 35 },
    { id: "food-exotic-lightmeal-glorpberrysoup", name: "Glorpberry Soup", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-exotic-lightmeal-glorpberrysoup.png", description: "A light soup of glorpberries.", price: 28 },
    { id: "food-exotic-lightmeal-plasmaberrypie", name: "Plasmaberry Pie", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-exotic-lightmeal-plasmaberrypie.png", description: "A sweet and tangy pie.", price: 30 },
    { id: "food-exotic-treat-fizzmelon", name: "Fizzmelon", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-exotic-treat-fizzmelon.png", description: "A fizzy, refreshing melon.", price: 15 },
    { id: "food-exotic-treat-jibbleroot", name: "Jibbleroot", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-exotic-treat-jibbleroot.png", description: "A crunchy exotic root.", price: 12 },
    { id: "food-exotic-treat-snorpfruit", name: "Snorpfruit", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-exotic-treat-snorpfruit.png", description: "A peculiar but tasty fruit.", price: 14 },
    { id: "food-fruit-treat-blueberries", name: "Blueberry", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-fruit-treat-blueberries.png", description: "A handful of fresh blueberries.", price: 8 },
    { id: "food-fruit-treat-strawberry", name: "Strawberry", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-fruit-treat-strawberry.png", description: "A juicy red strawberry.", price: 8 },
    { id: "food-snacks-snack-popcorn", name: "Popcorn", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-popcorn.png", description: "A bowl of buttery popcorn.", price: 10 },
    { id: "food-snacks-snack-ricecake", name: "Rice Cake", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-snacks-snack-ricecake.png", description: "A light and crispy rice cake.", price: 12 },
    { id: "food-snacks-treat-trailmix", name: "Trail Mix", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-snacks-treat-trailmix.png", description: "A mix of nuts and dried fruit.", price: 12 },
    { id: "food-sweets-treat-candy", name: "Candy", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-sweets-treat-candy.png", description: "A sweet piece of candy.", price: 5 },
    { id: "food-sweets-treat-cookie", name: "Cookie", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-sweets-treat-cookie.png", description: "Crispy edges, soft center, and exactly six chocolatey life decisions waiting to happen.", price: 7 },
    { id: "food-vegetables-heartymeal-broccolicasserole", name: "Broccoli Casserole", itemCategory: "food", type: "HeartyMeal", hungerRestored: 45, src: "/assets/food/food-vegetables-heartymeal-broccolicasserole.png", description: "A warm and cheesy casserole.", price: 35 },
    { id: "food-vegetables-lightmeal-cucumbersandwich", name: "Cucumber Sandwiches", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-vegetables-lightmeal-cucumbersandwich.png", description: "A light and refreshing sandwich.", price: 20 },
    { id: "food-vegetables-lightmeal-spinachandfetasalad", name: "Spinach and Feta Salad", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-vegetables-lightmeal-spinachandfetasalad.png", description: "A bowl full of leafy whispers, juicy secrets, and a few boldly confident cheese cubes.", price: 25 },
    { id: "food-vegetables-lightmeal-carrotandpeastirfry", name: "Carrot and Pea Stir-Fry", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-vegetables-lightmeal-carrotandpeastirfry.png", description: "Snappy peas, sweet carrot coins, and just enough sizzle to make dinner feel exciting again.", price: 22 },
    { id: "food-vegetables-feast-stuffedbakedpotato", name: "Stuffed Baked Potato", itemCategory: "food", type: "Feast", hungerRestored: 60, src: "/assets/food/food-vegetables-feast-stuffedbakedpotato.png", description: "Crispy on the outside, molten comfort within, and absolutely smothered in golden glory.", price: 40 },
    { id: "food-vegetables-treat-peas", name: "Peas", itemCategory: "food", type: "Treat", hungerRestored: 10, src: "/assets/food/food-vegetables-treat-peas.png", description: "A small pod of peas.", price: 6 },
    { id: "food-vegetables-snack-tomato", name: "Tomato", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-vegetables-snack-tomato.png", description: "Plump, dramatic, and ready to argue about whether it's a fruit or a vegetable.", price: 10 },
    { id: "food-vegetables-snack-corn", name: "Corn", itemCategory: "food", type: "Snack", hungerRestored: 15, src: "/assets/food/food-vegetables-snack-corn.png", description: "Each kernel packed with sunshine and a tiny promise to get stuck in your teeth later.", price: 10 },
    { id: "food-vegetables-lightmeal-lettucewrap", name: "Lettuce Wrap", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-vegetables-lightmeal-lettucewrap.png", description: "A crunchy green hug wrapped tightly around whatever surprises you've hidden inside.", price: 22 },
    { id: "food-vegetables-lightmeal-stuffedbellpepper", name: "Stuffed Bell Pepper", itemCategory: "food", type: "LightMeal", hungerRestored: 30, src: "/assets/food/food-vegetables-lightmeal-stuffedbellpepper.png", description: "One bite in and you'll discover a whole pantry hiding inside this bold little bell.", price: 25 },
];

// Apply enhanced descriptions to food items
const enhancedFoodItems = enhanceFoodItemsWithDescriptions(defaultFoodItems);

const defaultGroomingItems: GroomingInventoryItem[] = [
  { id: "grooming-dermal-basic-regularshampoo", name: "Regular Shampoo", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-dermal-basic-regularshampoo.png", description: "A gentle regular shampoo.", price: 20 },
  { id: "grooming-dermal-luxury-velvetcoatconditioner", name: "Velvet Coat Conditioner", itemCategory: "grooming", type: "LuxurySpa", cleanlinessBoost: 30, src: "/assets/grooming/grooming-dermal-luxury-velvetcoatconditioner.png", description: "For a luxurious, velvety coat.", price: 75 },
  { id: "grooming-dermal-premium-coconutoillotion", name: "Coconut Oil Lotion", itemCategory: "grooming", type: "PremiumCare", cleanlinessBoost: 25, src: "/assets/grooming/grooming-dermal-premium-coconutoillotion.png", description: "Nourishing coconut oil lotion.", price: 50 },
  { id: "grooming-dermal-standard-aloeleafgel", name: "Aloe Leaf Gel", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-dermal-standard-aloeleafgel.png", description: "Soothing aloe vera gel.", price: 35 },
  { id: "grooming-general-basic-everydaygroomingglove", name: "Grooming Glove", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-general-basic-everydaygroomingglove.png", description: "For daily grooming and bonding.", price: 25 },
  { id: "grooming-general-quickfix-onthegokit", name: "On-the-Go Kit", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-general-quickfix-onthegokit.png", description: "Quick grooming essentials.", price: 15 },
  { id: "grooming-general-quickfix-quickcleanspritz", name: "Quick Clean Spritz", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-general-quickfix-quickcleanspritz.png", description: "A refreshing quick clean spritz.", price: 12 },
  { id: "grooming-general-standard-basicbathsponge", name: "Bath Sponge", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-general-standard-basicbathsponge.png", description: "A simple sponge for bath time.", price: 30 },
  { id: "grooming-claws-standard-standardclawcleaner", name: "Claw Cleaner", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-claws-standard-standardclawcleaner.png", description: "Keeps claws neat and tidy.", price: 35 },
  { id: "grooming-fragrance-luxury-jasminemist", name: "Jasmine Mist", itemCategory: "grooming", type: "LuxurySpa", cleanlinessBoost: 5, src: "/assets/grooming/grooming-fragrance-luxury-jasminemist.png", description: "A luxurious jasmine fragrance.", price: 65 },
  { id: "grooming-fragrance-quickfix-quickfreshwipes", name: "Fresh Wipes", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-fragrance-quickfix-quickfreshwipes.png", description: "Fragranced wipes for a quick refresh.", price: 15 },
  { id: "grooming-fragrance-standard-everydayfreshener", name: "Everyday Freshener", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 5, src: "/assets/grooming/grooming-fragrance-standard-everydayfreshener.png", description: "A light, everyday freshening spray.", price: 28 },
  { id: "grooming-oral-basic-basicfloss", name: "Basic Floss", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-oral-basic-basicfloss.png", description: "For healthy gums.", price: 18 },
  { id: "grooming-oral-basic-plaintoothgel", name: "Plain Tooth Gel", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-oral-basic-plaintoothgel.png", description: "Simple tooth gel for cleaning.", price: 20 },
  { id: "grooming-oral-luxury-herbalmouthrinse", name: "Herbal Mouth Rinse", itemCategory: "grooming", type: "LuxurySpa", cleanlinessBoost: 10, src: "/assets/grooming/grooming-oral-luxury-herbalmouthrinse.png", description: "A refreshing herbal mouth rinse.", price: 60 },
];

const defaultToyItems: ToyInventoryItem[] = [
  {
    id: "toys-basic-fun-paperfrisbee",
    name: "Paper Frisbee",
    src: "/assets/toys/toys-basic-fun-paperfrisbee.png",
    happinessBoost: 10,
    description: "A simple paper frisbee for basic play.",
    itemCategory: "toy",
    type: "Basic",
    price: 15,
    phrases: [
      "Watch me catch it!",
      "This is fun!",
      "I like playing with this!",
      "Look how far it flies!",
      "My favorite toy!",
      "Perfect for playing catch!",
      "So light and fun!",
      "Can't get enough of this frisbee!",
      "I'm getting good at this!",
      "This is a nice toy!"
    ]
  },
  {
    id: "toys-classic-fun-rainbowspinner",
    name: "Rainbow Spinner",
    src: "/assets/toys/toys-classic-fun-rainbowspinner.png",
    happinessBoost: 15,
    description: "A fun, colorful spinner that will keep your pet entertained.",
    itemCategory: "toy",
    type: "Classic",
    price: 25,
    phrases: [
      "I love how it spins!",
      "Look at all the colors!",
      "Can we play with it?",
      "This is so much fun!",
      "I could watch it spin all day!"
    ]
  },
  {
    id: "toys-basic-exciting-rattlecube",
    name: "Rattle Cube",
    src: "/assets/toys/toys-basic-exciting-rattlecube.png",
    happinessBoost: 10,
    description: "A fun cube that rattles when shaken.",
    itemCategory: "toy",
    type: "Basic",
    price: 15,
    phrases: [
      "Rattle rattle!",
      "This is so fun to shake!",
      "I love the sound!",
      "I could play with this forever!",
      "My favorite toy to shake!"
    ]
  },
  {
    id: "toys-plushie-fun-pingu",
    name: "Pingu Plushie",
    src: "/assets/toys/toys-plushie-fun-pingu.png",
    happinessBoost: 20,
    description: "A soft plush toy that your pet will adore.",
    itemCategory: "toy",
    type: "Plushie",
    price: 35,
    phrases: [
      "So soft and cuddly!",
      "I love hugging my Pingu!",
      "This is so fun to play with!",
      "So soft and fun to play with!",
      "My favorite toy to carry around!"
    ]
  },
  {
    id: "toys-plushie-fun-pinga",
    name: "Pinga Plushie",
    src: "/assets/toys/toys-plushie-fun-pinga.png",
    happinessBoost: 20,
    description: "A cute penguin plushie that's perfect for cuddling.",
    itemCategory: "toy",
    type: "Plushie",
    price: 35,
    phrases: [
      "So soft and cuddly!",
      "I love hugging my Pinga!",
      "This is so fun to play with!",
      "So soft and fun to play with!",
      "My favorite toy to carry around!"
    ]
  },
  {
    id: "toys-classic-fun-spinningpinwheel",
    name: "Spinning Pinwheel",
    src: "/assets/toys/toys-classic-fun-spinningpinwheel.png",
    happinessBoost: 15,
    description: "A colorful pinwheel that spins in the breeze.",
    itemCategory: "toy",
    type: "Classic",
    price: 25,
    phrases: [
      "Watch it spin!",
      "So colorful!",
      "I love watching it twirl!",
      "This is so much fun!",
      "I could watch it spin all day!"
    ]
  },
  {
    id: "toys-classic-exciting-kaleidoscope",
    name: "Kaleidoscope",
    src: "/assets/toys/toys-classic-exciting-kaleidoscope.png",
    happinessBoost: 20,
    description: "A magical toy that creates beautiful patterns.",
    itemCategory: "toy",
    type: "Classic",
    price: 30,
    phrases: [
      "Look at the pretty patterns!",
      "This is so magical!",
      "I love the colors!",
      "So mesmerizing!",
      "I could look through this forever!"
    ]
  },
  {
    id: "toys-basic-exciting-rocketpopper",
    name: "Rocket Popper",
    src: "/assets/toys/toys-basic-exciting-rocketpopper.png",
    happinessBoost: 15,
    description: "A fun toy that pops and flies into the air.",
    itemCategory: "toy",
    type: "Basic",
    price: 20,
    phrases: [
      "Watch it fly!",
      "This is so exciting!",
      "I love when it pops!",
      "So much fun to play with!",
      "I could play with this all day!"
    ]
  },
  {
    id: "toys-basic-fun-bubblepopmat",
    name: "Bubble Pop Mat",
    src: "/assets/toys/toys-basic-fun-bubblepopmat.png",
    happinessBoost: 15,
    description: "A fun mat filled with satisfying bubble wrap.",
    itemCategory: "toy",
    type: "Basic",
    price: 20,
    phrases: [
      "Pop pop pop!",
      "This is so satisfying!",
      "I love the popping sound!",
      "So much fun to pop!",
      "I could pop these all day!"
    ]
  },
  {
    id: "toys-basic-fun-wigglystringwand",
    name: "Wiggly String Wand",
    src: "/assets/toys/toys-basic-fun-wigglystringwand.png",
    happinessBoost: 15,
    description: "A wand with a wiggly string that's fun to chase.",
    itemCategory: "toy",
    type: "Basic",
    price: 20,
    phrases: [
      "Watch me chase it!",
      "This is so fun to chase!",
      "I love playing with the string!",
      "So much fun to wiggle!",
      "I could play with this all day!"
    ]
  },
  {
    id: "toys-classic-fun-patchworkkickball",
    name: "Patchwork Kickball",
    src: "/assets/toys/toys-classic-fun-patchworkkickball.png",
    happinessBoost: 20,
    description: "A colorful patchwork ball perfect for kicking and playing.",
    itemCategory: "toy",
    type: "Classic",
    price: 30,
    phrases: [
      "Watch me kick it!",
      "This is so fun to play with!",
      "I love the colors!",
      "So much fun to kick!",
      "I could play with this all day!"
    ]
  },
  {
    id: "toys-classic-exciting-rooinbox",
    name: "Roo in Box",
    src: "/assets/toys/toys-classic-exciting-rooinbox.png",
    happinessBoost: 20,
    description: "A fun toy where a kangaroo pops out of a box.",
    itemCategory: "toy",
    type: "Classic",
    price: 30,
    phrases: [
      "Boo!",
      "This is so surprising!",
      "I love when Roo pops out!",
      "So much fun to play with!",
      "I could play with this all day!"
    ]
  }
];

// Combine all inventory items (excluding decorations, which are now handled separately)
const defaultAllItems: InventoryItem[] = [
    ...enhancedFoodItems,  // Use the enhanced food items with detailed descriptions
    ...defaultGroomingItems,
    ...defaultToyItems
];

interface InventoryContextType {
  items: InventoryItem[];
  consumeItem: (itemId: string) => void;
  getFilteredItems: (mainCategory: string, subCategory: string) => InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
};

const preloadImages = async (items: InventoryItem[]) => {
  const loadPromises = items.map(item => {
    return new Promise<void>((resolve) => {
      if (imageCache.has(item.src)) {
        resolve();
        return;
      }
      const img = new Image();
      img.src = item.src;
      imageCache.set(item.src, img);
      img.onload = () => resolve();
      img.onerror = () => {
        console.error(`Failed to load image: ${item.src}`);
        resolve(); // Resolve anyway to prevent blocking
      };
    });
  });

  await Promise.all(loadPromises);
};

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);

  // Initialize the cache and load inventory data on first render
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Preload first 20 item images for quick initial display
        await preloadImages(defaultAllItems.slice(0, 20));

        // Load inventory data from Firebase
        const inventoryRef = ref(db, "inventory");
        
        // Force reset inventory to defaults to ensure correct items
        await set(inventoryRef, defaultAllItems);
        console.log("Reset inventory to defaults");
        setItems(defaultAllItems);
        
        onValue(inventoryRef, (snapshot) => {
          const inventoryData = snapshot.val() as InventoryItem[] | null;
          console.log('Firebase inventory data:', inventoryData ? 
            `Found ${inventoryData.length} items. Categories: ${[...new Set(inventoryData.map(item => item.itemCategory))].join(', ')}` : 
            'No data');
            
          if (inventoryData && Array.isArray(inventoryData) && inventoryData.length > 0) {
            // Check if we have all required categories
            const categories = new Set(inventoryData.map(item => item.itemCategory));
            const requiredCategories = ['food', 'grooming', 'toy'] as const;
            const hasAllCategories = requiredCategories.every(cat => categories.has(cat));
            
            if (!hasAllCategories) {
              console.log('Missing categories in inventory, resetting to defaults');
              set(inventoryRef, defaultAllItems)
                .then(() => {
                  console.log("Default inventory saved to Firebase");
                  setItems(defaultAllItems);
                })
                .catch(error => {
                  console.error("Error saving default inventory:", error);
                  setItems(defaultAllItems);
                });
              return;
            }

            // Make sure price property is correctly converted to number
            const fixedData = inventoryData.map(item => {
              if (item.price === undefined || item.price === null) {
                const defaultItem = defaultAllItems.find(defaultItem => defaultItem.id === item.id);
                return {
                  ...item,
                  price: defaultItem?.price || 0
                };
              }
              return item;
            });
            setItems(fixedData);
            console.log('Fixed inventory data with price preservation:', fixedData[0]);
          } else {
            console.log('No valid inventory data found, using default items');
            // If no data in Firebase or data is invalid, set default and save to Firebase
            set(inventoryRef, defaultAllItems)
              .then(() => {
                console.log("Default inventory saved to Firebase");
                setItems(defaultAllItems);
              })
              .catch(error => {
                console.error("Error saving default inventory:", error);
                setItems(defaultAllItems);
              });
          }
        }, {
          onlyOnce: false
        });
        
        // Continue preloading remaining items in the background
        setTimeout(() => {
          preloadImages(defaultAllItems.slice(20))
            .catch(err => console.error("Error preloading images:", err));
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize inventory cache:", error);
        setItems(defaultAllItems);
      }
    };

    initializeCache();
  }, []);

  const consumeItem = (itemId: string) => {
    // Remove the item from the inventory
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    
    // Save to Firebase
    const inventoryRef = ref(db, "inventory");
    set(inventoryRef, updatedItems)
      .catch(error => console.error("Error updating inventory:", error));
  };

  const getFilteredItems = useCallback(
    (mainCategory: string, subCategory: string) => {
      if (mainCategory === "Food") {
        return items.filter(item => 
          item.itemCategory === "food" && 
          (item as FoodInventoryItem).type === subCategory
        );
      } else if (mainCategory === "Grooming") {
        return items.filter(item => 
          item.itemCategory === "grooming" && 
          (item as GroomingInventoryItem).type === subCategory
        );
      } else if (mainCategory === "Toys") {
        return items.filter(item => 
          item.itemCategory === "toy" && 
          (item as ToyInventoryItem).type === subCategory
        );
      } 
      return [];
    },
    [items]
  );

  return (
    <InventoryContext.Provider
      value={{
      items,
      consumeItem,
        getFilteredItems,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
