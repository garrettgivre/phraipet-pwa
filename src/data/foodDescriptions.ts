// src/data/foodDescriptions.ts
// Mapping of food items to their descriptions, categories, and stats

interface FoodItemData {
  name: string;
  category: string;
  mealSize: string;
  description: string;
  hungerBoost: number;
}

export const foodItemsData: FoodItemData[] = [
  // Dairy
  {
    name: "Milk",
    category: "Dairy",
    mealSize: "Light Meal",
    description: "Classic, creamy, and always ready to negotiate peace between cookies and cereal.",
    hungerBoost: 30
  },
  {
    name: "Kefir",
    category: "Dairy",
    mealSize: "Light Meal",
    description: "A bubbly bottle of gut magic. Tastes like a secret handshake between milk and mischief.",
    hungerBoost: 30
  },
  {
    name: "Cheese",
    category: "Dairy",
    mealSize: "Snack",
    description: "A crumbly wedge straight from the Great Dairy Crater. Pairs well with mischief.",
    hungerBoost: 15
  },
  {
    name: "Yogurt",
    category: "Dairy",
    mealSize: "Snack",
    description: "Smooth, creamy, and ideal for dipping, sipping, or contemplating life's mysteries between bites.",
    hungerBoost: 15
  },
  {
    name: "Cottage Cheese",
    category: "Dairy",
    mealSize: "Snack",
    description: "A lumpy little snack that's either delightfully creamy or deeply confusing. Sometimes both.",
    hungerBoost: 15
  },
  {
    name: "Whey",
    category: "Dairy",
    mealSize: "Snack",
    description: "Mysterious, nutritious, and somehow always mentioned in ancient workout scrolls.",
    hungerBoost: 15
  },

  // Drinks
  {
    name: "Juice",
    category: "Drinks",
    mealSize: "Light Meal",
    description: "Bright, sweet, and suspiciously good at disappearing after just one sip.",
    hungerBoost: 30
  },
  {
    name: "Soda",
    category: "Drinks",
    mealSize: "Light Meal",
    description: "Fizzy, zippy, and scientifically proven to make burps 47% louder.",
    hungerBoost: 30
  },
  {
    name: "Tea",
    category: "Drinks",
    mealSize: "Treat",
    description: "Calm in a cup. Perfect for unwinding or dramatically staring out a window.",
    hungerBoost: 10
  },

  // Exotic
  {
    name: "Wobblefruit Stew",
    category: "Exotic",
    mealSize: "Hearty Meal",
    description: "Hearty, colorful, and every bite is a surprise bounce! Comes with a free splatter warning.",
    hungerBoost: 45
  },
  {
    name: "Glorpberry Soup",
    category: "Exotic",
    mealSize: "Light Meal",
    description: "Wobbly, bubbly, and suspiciously alive. Slurp fast before it slurps back!",
    hungerBoost: 30
  },
  {
    name: "Plasmaberry Pie",
    category: "Exotic",
    mealSize: "Light Meal",
    description: "It glows, it jiggles, and legend says it hums a little song if you eat it at midnight!",
    hungerBoost: 30
  },
  {
    name: "Fizzmelon",
    category: "Exotic",
    mealSize: "Treat",
    description: "Bites like a fruit, fizzes like a soda, and may or may not launch tiny bubbles up your nose!",
    hungerBoost: 10
  },
  {
    name: "Jibbleroot",
    category: "Exotic",
    mealSize: "Treat",
    description: "Wiggles when you pick it up, jiggles when you try to eat it, and giggles if you listen closely!",
    hungerBoost: 10
  },
  {
    name: "Snorpfruit",
    category: "Exotic",
    mealSize: "Treat",
    description: "The squiggle on top is edible... probably. Eat at your own giggle risk!",
    hungerBoost: 10
  },

  // Fruits
  {
    name: "Watermelon Salad",
    category: "Fruits",
    mealSize: "Feast",
    description: "Juicy, refreshing, and technically a salad, so you can feel responsible while eating way too much.",
    hungerBoost: 60
  },
  {
    name: "Apple Slices with Peanut Butter",
    category: "Fruits",
    mealSize: "Light Meal",
    description: "A balanced combo of sweet, crunchy, and that one bite where the peanut butter tries to glue your mouth shut.",
    hungerBoost: 30
  },
  {
    name: "Peach Cobbler",
    category: "Fruits",
    mealSize: "Light Meal",
    description: "Soft, sweet, and scientifically engineered to require a nap immediately after eating.",
    hungerBoost: 30
  },
  {
    name: "Strawberry",
    category: "Fruits",
    mealSize: "Treat",
    description: "Juicy, sweet, and scientifically proven to make snack time 87% happier!",
    hungerBoost: 10
  },
  {
    name: "Blueberry",
    category: "Fruits",
    mealSize: "Treat",
    description: "Tiny, tangy, and known to roll right off tables when you're not looking!",
    hungerBoost: 10
  },

  // Snacks
  {
    name: "Granola Bar",
    category: "Snacks",
    mealSize: "Light Meal",
    description: "Packed with energy, mystery berries, and the structural integrity of a small building.",
    hungerBoost: 30
  },
  {
    name: "Chips",
    category: "Snacks",
    mealSize: "Snack",
    description: "Thin, crunchy, and mysteriously gone before you even realize.",
    hungerBoost: 15
  },
  {
    name: "Pretzels",
    category: "Snacks",
    mealSize: "Snack",
    description: "Perfectly salted and perfectly tangled.",
    hungerBoost: 15
  },
  {
    name: "Popcorn",
    category: "Snacks",
    mealSize: "Snack",
    description: "Light, fluffy, and dangerously good at sneaking down your shirt when you're not paying attention!",
    hungerBoost: 15
  },
  {
    name: "Rice Cake",
    category: "Snacks",
    mealSize: "Snack",
    description: "Light, crunchy, and loud enough to alert everyone within a three-mile radius when bitten!",
    hungerBoost: 15
  },
  {
    name: "Trail Mix",
    category: "Snacks",
    mealSize: "Treat",
    description: "A bold blend of sweet, salty, and that one mystery nut nobody can quite identify!",
    hungerBoost: 10
  },

  // Sweets
  {
    name: "Candy",
    category: "Sweets",
    mealSize: "Treat",
    description: "Swirls of sugar and a guaranteed burst of zoomies after consumption! Handle responsibly.",
    hungerBoost: 10
  },
  {
    name: "Cookie",
    category: "Sweets",
    mealSize: "Treat",
    description: "Crispy edges, soft center, and exactly six chocolatey life decisions waiting to happen.",
    hungerBoost: 10
  },

  // Vegetables
  {
    name: "Broccoli Casserole",
    category: "Vegetables",
    mealSize: "Hearty Meal",
    description: "Officially 80% cheese, 20% broccoli, and 100% grandma-approved comfort magic!",
    hungerBoost: 45
  },
  {
    name: "Stuffed Baked Potato",
    category: "Vegetables", 
    mealSize: "Feast",
    description: "Crispy on the outside, molten comfort within, and absolutely smothered in golden glory.",
    hungerBoost: 60
  },
  {
    name: "Cucumber Sandwiches",
    category: "Vegetables",
    mealSize: "Light Meal",
    description: "For when you want to feel fancy but also kinda lazy. Comes with a light breeze of sophistication!",
    hungerBoost: 30
  },
  {
    name: "Stuffed Bell Pepper",
    category: "Vegetables",
    mealSize: "Light Meal",
    description: "One bite in and you'll discover a whole pantry hiding inside this bold little bell.",
    hungerBoost: 30
  },
  {
    name: "Lettuce Wrap",
    category: "Vegetables",
    mealSize: "Light Meal",
    description: "A crunchy green hug wrapped tightly around whatever surprises you've hidden inside.",
    hungerBoost: 30
  },
  {
    name: "Spinach and Feta Salad",
    category: "Vegetables",
    mealSize: "Light Meal",
    description: "A bowl full of leafy whispers, juicy secrets, and a few boldly confident cheese cubes.",
    hungerBoost: 30
  },
  {
    name: "Carrot and Pea Stir-Fry",
    category: "Vegetables",
    mealSize: "Light Meal",
    description: "Snappy peas, sweet carrot coins, and just enough sizzle to make dinner feel exciting again.",
    hungerBoost: 30
  },
  {
    name: "Tomato",
    category: "Vegetables",
    mealSize: "Snack",
    description: "Plump, dramatic, and ready to argue about whether it's a fruit or a vegetable.",
    hungerBoost: 15
  },
  {
    name: "Corn",
    category: "Vegetables",
    mealSize: "Snack",
    description: "Each kernel packed with sunshine and a tiny promise to get stuck in your teeth later.",
    hungerBoost: 15
  },
  {
    name: "Peas",
    category: "Vegetables",
    mealSize: "Treat",
    description: "Five tiny green buddies tucked in a cozy veggie bed. Pop 'em, bop 'em, snack 'em!",
    hungerBoost: 10
  }
];

// Lookup map for quick access to descriptions by food name
export const foodDescriptionMap: Record<string, string> = {};
export const foodCategoryMap: Record<string, string> = {};

// Initialize the maps
foodItemsData.forEach(item => {
  foodDescriptionMap[item.name] = item.description;
  foodCategoryMap[item.name] = item.category;
});

// Function to get description by food name
export function getFoodDescription(foodName: string): string {
  return foodDescriptionMap[foodName] || "A tasty treat for your pet.";
}

// Function to get category by food name
export function getFoodCategory(foodName: string): string {
  return foodCategoryMap[foodName] || "Miscellaneous";
}

// Function to get all food items in a specific category
export function getFoodItemsByCategory(category: string): FoodItemData[] {
  return foodItemsData.filter(item => item.category === category);
}

// Function to get food item data by name
export function getFoodItemByName(name: string): FoodItemData | undefined {
  return foodItemsData.find(item => item.name === name);
} 