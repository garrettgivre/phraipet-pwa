import { ToyInventoryItem, GroomingInventoryItem, FoodInventoryItem } from '../types';

export const defaultToyItems: ToyInventoryItem[] = [
  {
    id: "toys-basic-fun-rocketpopper",
    name: "Rocket Popper",
    itemCategory: "toy",
    type: "Basic",
    src: "/assets/toys/toys-basic-fun-rocketpopper.png",
    description: "A fun rocket-shaped popper that makes exciting sounds!",
    price: 20,
    happinessBoost: 15,
    phrases: ["*pop* *pop* *pop*", "Wheee!", "That was fun!"]
  },
  {
    id: "toys-basic-fun-bubblepopmat",
    name: "Bubble Pop Mat",
    itemCategory: "toy",
    type: "Basic",
    src: "/assets/toys/toys-basic-fun-bubblepopmat.png",
    description: "A mat full of satisfying bubble wrap to pop!",
    price: 20,
    happinessBoost: 15,
    phrases: ["*pop* *pop* *pop*", "So satisfying!", "More bubbles!"]
  },
  {
    id: "toys-basic-fun-wigglystringwand",
    name: "Wiggly String Wand",
    itemCategory: "toy",
    type: "Basic",
    src: "/assets/toys/toys-basic-fun-wigglystringwand.png",
    description: "A wand with a wiggly string that's fun to chase!",
    price: 20,
    happinessBoost: 15,
    phrases: ["*wiggle* *wiggle*", "Catch it!", "So wiggly!"]
  },
  {
    id: "toys-classic-fun-kaleidoscope",
    name: "Kaleidoscope",
    itemCategory: "toy",
    type: "Classic",
    src: "/assets/toys/toys-classic-fun-kaleidoscope.png",
    description: "A beautiful kaleidoscope with mesmerizing patterns!",
    price: 30,
    happinessBoost: 20,
    phrases: ["So pretty!", "Look at the colors!", "Mesmerizing!"]
  },
  {
    id: "toys-classic-fun-rooinbox",
    name: "Roo in Box",
    itemCategory: "toy",
    type: "Classic",
    src: "/assets/toys/toys-classic-fun-rooinbox.png",
    description: "A classic jack-in-the-box with a cute kangaroo!",
    price: 30,
    happinessBoost: 20,
    phrases: ["*pop* Surprise!", "Boo!", "Do it again!"]
  },
  {
    id: "toys-classic-fun-patchworkkickball",
    name: "Patchwork Kickball",
    itemCategory: "toy",
    type: "Classic",
    src: "/assets/toys/toys-classic-fun-patchworkkickball.png",
    description: "A colorful patchwork ball perfect for kicking around!",
    price: 30,
    happinessBoost: 20,
    phrases: ["Kick it!", "Bounce bounce!", "Catch!"]
  }
];

export const defaultGroomingItems: GroomingInventoryItem[] = [
  {
    id: "grooming-basickit-brush",
    name: "Basic Brush",
    itemCategory: "grooming",
    type: "BasicKit",
    src: "/assets/grooming/grooming-basickit-brush.png",
    description: "A gentle brush for basic grooming needs.",
    price: 15,
    cleanlinessBoost: 10,
    phrases: ["So soft!", "That feels nice!", "More brushing!"]
  },
  {
    id: "grooming-standardset-shampoo",
    name: "Standard Shampoo",
    itemCategory: "grooming",
    type: "StandardSet",
    src: "/assets/grooming/grooming-standardset-shampoo.png",
    description: "A gentle shampoo for regular cleaning.",
    price: 25,
    cleanlinessBoost: 20,
    phrases: ["Bubbles!", "So fresh!", "Clean and shiny!"]
  }
];

export const defaultFoodItems: FoodInventoryItem[] = [
  {
    id: "food-kefir-lightmeal",
    name: "Kefir",
    itemCategory: "food",
    type: "LightMeal",
    hungerRestored: 30,
    happinessBoost: 15,
    src: "/assets/food/food-dairy-lightmeal-kefir.png",
    description: "A fermented milk drink.",
    price: 25,
    phrases: ["Refreshing!", "So creamy!", "More please!"]
  },
  {
    id: "food-milk-lightmeal",
    name: "Milk",
    itemCategory: "food",
    type: "LightMeal",
    hungerRestored: 30,
    happinessBoost: 15,
    src: "/assets/food/food-dairy-lightmeal-milk.png",
    description: "A refreshing glass of milk.",
    price: 20,
    phrases: ["Mmm, milk!", "So fresh!", "Delicious!"]
  },
  {
    id: "food-cheese-snack",
    name: "Cheese",
    itemCategory: "food",
    type: "Snack",
    hungerRestored: 15,
    happinessBoost: 10,
    src: "/assets/food/food-dairy-snack-cheese.png",
    description: "A tasty slice of cheese.",
    price: 15,
    phrases: ["Yummy cheese!", "So good!", "More please!"]
  }
];

export const defaultAllItems = [
  ...defaultToyItems,
  ...defaultGroomingItems,
  ...defaultFoodItems
]; 