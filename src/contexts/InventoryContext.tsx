// src/contexts/InventoryContext.tsx
import { createContext, useState, useEffect, type ReactNode, useContext, useCallback } from "react";
import { db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import type {
  InventoryItem,
  DecorationInventoryItem,
  FoodInventoryItem,
  GroomingInventoryItem,
  ToyInventoryItem,
  RoomDecorItem,
  // GroomingCategory, // Not directly imported, but used via GroomingInventoryItem
  // ToyCategory,      // Not directly imported, but used via ToyInventoryItem
} from "../types";

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

  // Basic Theme
  { id: "deco-basic-floor", name: "Basic Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/basic-floor.png" },
  { id: "deco-basic-wall", name: "Basic Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/basic-wall.png" },
  { id: "deco-basic-ceiling", name: "Basic Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/basic-ceilling.png" },
  { id: "deco-basic-trim", name: "Basic Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/basic-trim.png" },

  // Wacky Theme
  { id: "deco-wacky-floor", name: "Wacky Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/wacky-floor.png" },
  { id: "deco-wacky-wall", name: "Wacky Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/wacky-wall.png" },
  { id: "deco-wacky-ceiling", name: "Wacky Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/wacky-ceiling.png" },
  { id: "deco-wacky-trim", name: "Wacky Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/wacky-trim.png" },

  // Art Deco Theme
  { id: "deco-artdeco-floor", name: "Art Deco Floor", itemCategory: "decoration", type: "floor", src: "/assets/floors/artdeco-floor.png" },
  { id: "deco-artdeco-wall", name: "Art Deco Wall", itemCategory: "decoration", type: "wall", src: "/assets/walls/artdeco-wall.png" },
  { id: "deco-artdeco-ceiling", name: "Art Deco Ceiling", itemCategory: "decoration", type: "ceiling", src: "/assets/ceilings/artdeco-ceiling.png" },
  { id: "deco-artdeco-trim", name: "Art Deco Trim", itemCategory: "decoration", type: "trim", src: "/assets/trim/artdeco-trim.png" },

  // Removed Example Decor Items (Potted Plant, Floor Lamp, Rainy Window)
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
  // Existing items, re-categorized if necessary, and new items added
  { id: "grooming-dermal-basic-regularshampoo", name: "Regular Shampoo", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-dermal-basic-regularshampoo.png", description: "A gentle regular shampoo." },
  { id: "grooming-dermal-luxury-velvetcoatconditioner", name: "Velvet Coat Conditioner", itemCategory: "grooming", type: "LuxurySpa", cleanlinessBoost: 30, src: "/assets/grooming/grooming-dermal-luxury-velvetcoatconditioner.png", description: "For a luxurious, velvety coat." },
  { id: "grooming-dermal-premium-coconutoillotion", name: "Coconut Oil Lotion", itemCategory: "grooming", type: "PremiumCare", cleanlinessBoost: 25, src: "/assets/grooming/grooming-dermal-premium-coconutoillotion.png", description: "Nourishing coconut oil lotion." },
  { id: "grooming-dermal-standard-aloeleafgel", name: "Aloe Leaf Gel", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-dermal-standard-aloeleafgel.png", description: "Soothing aloe vera gel." },
  { id: "grooming-general-basic-everydaygroomingglove", name: "Grooming Glove", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-general-basic-everydaygroomingglove.png", description: "For daily grooming and bonding." },
  { id: "grooming-general-quickfix-onthegokit", name: "On-the-Go Kit", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-general-quickfix-onthegokit.png", description: "Quick grooming essentials." },
  { id: "grooming-general-quickfix-quickcleanspritz", name: "Quick Clean Spritz", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-general-quickfix-quickcleanspritz.png", description: "A refreshing quick clean spritz." },
  { id: "grooming-general-standard-basicbathsponge", name: "Bath Sponge", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-general-standard-basicbathsponge.png", description: "A simple sponge for bath time." },
  { id: "grooming-claws-standard-standardclawcleaner", name: "Claw Cleaner", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 20, src: "/assets/grooming/grooming-claws-standard-standardclawcleaner.png", description: "Keeps claws neat and tidy." },
  { id: "grooming-fragrance-luxury-jasminemist", name: "Jasmine Mist", itemCategory: "grooming", type: "LuxurySpa", cleanlinessBoost: 5, src: "/assets/grooming/grooming-fragrance-luxury-jasminemist.png", description: "A luxurious jasmine fragrance." },
  { id: "grooming-fragrance-quickfix-quickfreshwipes", name: "Fresh Wipes", itemCategory: "grooming", type: "QuickFix", cleanlinessBoost: 10, src: "/assets/grooming/grooming-fragrance-quickfix-quickfreshwipes.png", description: "Fragranced wipes for a quick refresh." },
  { id: "grooming-fragrance-standard-everydayfreshener", name: "Everyday Freshener", itemCategory: "grooming", type: "StandardSet", cleanlinessBoost: 5, src: "/assets/grooming/grooming-fragrance-standard-everydayfreshener.png", description: "A light, everyday freshening spray." },
  { id: "grooming-oral-basic-basicfloss", name: "Basic Floss", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-oral-basic-basicfloss.png", description: "For healthy gums." },
  { id: "grooming-oral-basic-plaintoothgel", name: "Plain Tooth Gel", itemCategory: "grooming", type: "BasicKit", cleanlinessBoost: 15, src: "/assets/grooming/grooming-oral-basic-plaintoothgel.png", description: "Simple tooth gel for cleaning." },
  { id: "grooming-oral-luxury-herbalmouthrinse", name: "Herbal Mouth Rinse", itemCategory: "grooming", type: "LuxurySpa", cleanlinessBoost: 10, src: "/assets/grooming/grooming-oral-luxury-herbalmouthrinse.png", description: "A refreshing herbal mouth rinse." },
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
    id: "toys-basic-exciting-rattlecube",
    name: "Rattle Cube",
    src: "/assets/toys/toys-basic-exciting-rattlecube.png",
    happinessBoost: 15,
    description: "A fun cube that rattles when shaken!",
    itemCategory: "toy",
    type: "Basic",
    phrases: [
      "Rattle rattle!",
      "I love the sound!",
      "This is exciting!",
      "Watch me shake it!",
      "The best cube ever!",
      "I'm a cube master!",
      "This cube is mine!",
      "So much fun to play with!",
      "I love the rattling sound!",
      "This is really cool!"
    ]
  },
  {
    id: "toys-basic-dull-lintlump",
    name: "Lint Lump",
    src: "/assets/toys/toys-basic-dull-lintlump.png",
    happinessBoost: 5,
    description: "A simple lump of lint to play with.",
    itemCategory: "toy",
    type: "Basic",
    phrases: [
      "It's soft...",
      "I guess it's okay...",
      "This is... something to do.",
      "Watch me... roll it.",
      "It's a toy.",
      "I'm playing with it.",
      "This lint is here.",
      "It's something to do.",
      "It's soft, at least.",
      "Well, it's a toy."
    ]
  },
  {
    id: "toys-classic-fun-rainbowspinner",
    name: "Rainbow Spinner",
    src: "/assets/toys/toys-classic-fun-rainbowspinner.png",
    happinessBoost: 20,
    description: "A colorful spinning toy that creates beautiful patterns.",
    itemCategory: "toy",
    type: "Classic",
    phrases: [
      "Watch the colors spin!",
      "So many pretty colors!",
      "It's like a rainbow in motion!",
      "The patterns are mesmerizing!",
      "Spin spin spin!",
      "Look at all those colors!",
      "It's like a mini rainbow!",
      "The colors are so vibrant!",
      "Spin it faster!",
      "What beautiful patterns!"
    ]
  },
  {
    id: "toys-classic-dull-flatsqueaker",
    name: "Flat Squeaker",
    src: "/assets/toys/toys-classic-dull-flatsqueaker.png",
    happinessBoost: 5,
    description: "An old but still fun squeaky toy.",
    itemCategory: "toy",
    type: "Classic",
    phrases: [
      "Squeak...",
      "It still works...",
      "This is... okay.",
      "Watch me... play.",
      "My old toy.",
      "It's still here.",
      "This squeaker exists.",
      "Still makes noise.",
      "The squeak is old.",
      "It's a toy, I guess."
    ]
  },
  {
    id: "toys-gadget-fun-clickomatic",
    name: "Click-o-matic",
    src: "/assets/toys/toys-gadget-fun-clickomatic.png",
    happinessBoost: 25,
    description: "A fun gadget that makes clicking sounds!",
    itemCategory: "toy",
    type: "Gadget",
    phrases: [
      "Click click!",
      "I love this gadget!",
      "This is fun!",
      "Watch me click it!",
      "The best clicker!",
      "I'm good at clicking!",
      "This clicker is mine!",
      "So much fun to click!",
      "I love the clicking!",
      "This is a cool gadget!"
    ]
  },
  {
    id: "toys-gadget-thrilling-starlightprojector",
    name: "Starlight Projector",
    src: "/assets/toys/toys-gadget-thrilling-starlightprojector.png",
    happinessBoost: 30,
    description: "A magical projector that creates star patterns!",
    itemCategory: "toy",
    type: "Gadget",
    phrases: [
      "WOW! Look at the stars!",
      "This is INCREDIBLE!",
      "I'm in AWE!",
      "Watch these AMAZING patterns!",
      "The MOST AMAZING projector!",
      "I'm a STAR CHASER!",
      "These stars are MAGICAL!",
      "This is THRILLING!",
      "I'm LOST in the stars!",
      "This is the COOLEST gadget EVER!"
    ]
  },
  {
    id: "toys-plushie-fun-pingu",
    name: "Pingu Plushie",
    src: "/assets/toys/toys-plushie-fun-pingu.png",
    happinessBoost: 15,
    description: "A cozy plushie of the famous claymation penguin.",
    itemCategory: "toy",
    type: "Plushie",
    phrases: [
      "NOOT NOOT!",
      "Noot noot noot!",
      "Noot! *waddles excitedly*",
      "Noot noot! *slips on ice*",
      "Noot! *makes seal noises*",
      "Noot noot! *dances like Pingu*",
      "Noot! *pretends to fish*",
      "Noot noot! *builds snowman*",
      "Noot! *plays with sled*",
      "Noot noot! *makes snow angels*"
    ]
  },
  {
    id: "toys-plushie-mindblowing-sentientsnugglepod",
    name: "Sentient Snuggle Pod",
    src: "/assets/toys/toys-plushie-mindblowing-sentientsnugglepod.png",
    happinessBoost: 35,
    description: "A magical plushie that responds to cuddles!",
    itemCategory: "toy",
    type: "Plushie",
    phrases: [
      "OH MY GOODNESS! It's ALIVE!",
      "This is MINDBLOWING!",
      "I can't BELIEVE it responds!",
      "Watch it REACT to my cuddles!",
      "The MOST AMAZING pod EVER!",
      "I'm a POD WHISPERER!",
      "This pod is MAGICAL!",
      "This is BEYOND incredible!",
      "I'm in AWE of how it moves!",
      "This is the MOST AMAZING plushie EVER!"
    ]
  },
  {
    id: "toys-wonder-exciting-skyboundyoyo",
    name: "Skybound Yo-yo",
    src: "/assets/toys/toys-wonder-exciting-skyboundyoyo.png",
    happinessBoost: 30,
    description: "A magical yo-yo that floats in the air!",
    itemCategory: "toy",
    type: "Wonder",
    phrases: [
      "WOW! It floats!",
      "This is AMAZING!",
      "I love how it hovers!",
      "Watch it FLY through the air!",
      "The COOLEST yo-yo ever!",
      "I'm a yo-yo MASTER!",
      "This yo-yo is MAGICAL!",
      "So EXCITING to play with!",
      "I love how it DEFIES gravity!",
      "This is the MOST FUN toy!"
    ]
  },
  {
    id: "toys-wonder-mindblowing-cosmicwonderbox",
    name: "Cosmic Wonder Box",
    src: "/assets/toys/toys-wonder-mindblowing-cosmicwonderbox.png",
    happinessBoost: 40,
    description: "A mysterious box that creates cosmic wonders!",
    itemCategory: "toy",
    type: "Wonder",
    phrases: [
      "OH MY STARS! It's MAGICAL!",
      "This is BEYOND INCREDIBLE!",
      "I'm LOST in the COSMIC WONDERS!",
      "Watch these MIND-BENDING effects!",
      "The MOST AMAZING box in the UNIVERSE!",
      "I'm a COSMIC MASTER!",
      "This box is from ANOTHER DIMENSION!",
      "This is BEYOND IMAGINATION!",
      "I'm in AWE of the COSMIC PATTERNS!",
      "This is the MOST MIND-BLOWING wonder EVER!"
    ]
  }
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
  trim: "",
  decor: [],
  overlay: "",
};

interface InventoryContextType {
  items: InventoryItem[];
  roomLayers: RoomLayers;
  roomLayersLoading: boolean;
  setRoomLayer: (type: "floor" | "wall" | "ceiling" | "trim" | "overlay", src: string) => void;
  addDecorItem: (type: "decor", decor: RoomDecorItem) => void;
  consumeItem: (itemId: string) => void;
  getFilteredItems: (mainCategory: string, subCategory: string) => InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType>({
  items: defaultAllItems,
  roomLayers: defaultRoomLayersData,
  roomLayersLoading: true,
  setRoomLayer: () => { console.warn("setRoomLayer called on default context"); },
  addDecorItem: () => { console.warn("addDecorItem called on default context"); },
  consumeItem: (itemId: string) => { console.warn(`consumeItem(${itemId}) called on default context`); },
  getFilteredItems: () => [],
});

export const useInventory = () => useContext(InventoryContext);

export const imageCache = new Map<string, HTMLImageElement>();

const preloadImages = async (items: InventoryItem[]) => {
  const imagePromises = items.map(item => {
    return new Promise((resolve, reject) => {
      if (imageCache.has(item.src)) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.src = item.src;
      img.crossOrigin = "anonymous";
      imageCache.set(item.src, img);
      img.onload = () => resolve(null);
      img.onerror = () => reject(new Error(`Failed to load image: ${item.src}`));
    });
  });

  try {
    await Promise.all(imagePromises);
  } catch (error) {
    console.error("Error preloading images:", error);
  }
};

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(defaultAllItems);
  const [roomLayers, setRoomLayers] = useState<RoomLayers>(defaultRoomLayersData);
  const [roomLayersLoading, setRoomLayersLoading] = useState<boolean>(true);
  const [filteredItemsCache, setFilteredItemsCache] = useState<Record<string, InventoryItem[]>>({});

  // Preload all images and cache all category combinations when the component mounts
  useEffect(() => {
    const initializeCache = async () => {
      // Preload all images
      await preloadImages(items);

      // Preload all category combinations
      const mainCategories = ["Decorations", "Food", "Grooming", "Toys"];
      const subCategories = {
        Decorations: ["wall", "floor", "ceiling", "trim", "decor", "overlay"],
        Food: ["Treat", "Snack", "LightMeal", "HeartyMeal", "Feast"],
        Grooming: ["QuickFix", "BasicKit", "StandardSet", "PremiumCare", "LuxurySpa"],
        Toys: ["Basic", "Classic", "Plushie", "Gadget", "Wonder"]
      };

      const newCache: Record<string, InventoryItem[]> = {};
      
      mainCategories.forEach(mainCategory => {
        subCategories[mainCategory as keyof typeof subCategories].forEach(subCategory => {
          const cacheKey = `${mainCategory}-${subCategory}`;
          newCache[cacheKey] = items.filter(item => {
            if (mainCategory === "Decorations") return item.itemCategory === "decoration" && (item as DecorationInventoryItem).type === subCategory;
            if (mainCategory === "Food") return item.itemCategory === "food" && (item as FoodInventoryItem).type === subCategory;
            if (mainCategory === "Grooming") return item.itemCategory === "grooming" && (item as GroomingInventoryItem).type === subCategory;
            if (mainCategory === "Toys") return item.itemCategory === "toy" && (item as ToyInventoryItem).type === subCategory;
            return false;
          });
        });
      });

      setFilteredItemsCache(newCache);
    };

    initializeCache();
  }, []); // Only run once on mount

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
          trim: firebaseData.trim || defaultRoomLayersData.trim,
          decor: Array.isArray(firebaseData.decor) ? firebaseData.decor : [],
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

  const setRoomLayer = (type: "floor" | "wall" | "ceiling" | "trim" | "overlay", src: string) => {
    const updatedLayers = { ...roomLayers, [type]: src };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  const addDecorItem = (type: "decor", decor: RoomDecorItem) => {
    const updatedLayers = {
      ...roomLayers,
      [type]: [...(roomLayers[type] || []), decor],
    };
    setRoomLayers(updatedLayers);
    saveRoomToFirebase(updatedLayers);
  };

  // Update cache only when items are consumed
  const consumeItem = (itemId: string) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== itemId);
      
      // Update cache for the affected categories
      setFilteredItemsCache(prevCache => {
        const newCache = { ...prevCache };
        Object.keys(newCache).forEach(key => {
          newCache[key] = newCache[key].filter(item => item.id !== itemId);
        });
        return newCache;
      });
      
      return newItems;
    });
    console.log(`Item ${itemId} consumed from local list.`);
  };

  const getFilteredItems = useCallback((mainCategory: string, subCategory: string) => {
    const cacheKey = `${mainCategory}-${subCategory}`;
    return filteredItemsCache[cacheKey] || [];
  }, [filteredItemsCache]);

  return (
    <InventoryContext.Provider value={{
      items,
      roomLayers,
      roomLayersLoading,
      setRoomLayer,
      addDecorItem,
      consumeItem,
      getFilteredItems
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
