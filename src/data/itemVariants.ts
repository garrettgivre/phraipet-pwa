export interface ColorVariant {
  name: string;
  value: string; // CSS color or hex
  fileSuffix: string;
}

export interface ItemVariantConfig {
  itemId: string;
  colors: ColorVariant[];
}

export const WOOD_VARIANTS: ColorVariant[] = [
  { name: "Oak", value: "#C19A6B", fileSuffix: "oak" },
  { name: "Ash", value: "#C8C8C8", fileSuffix: "ash" },
  { name: "Birch", value: "#F0E6D2", fileSuffix: "birch" },
  { name: "Cherry", value: "#DE8282", fileSuffix: "cherry" },
  { name: "Mahogany", value: "#6D2D2D", fileSuffix: "mahogany" },
  { name: "Walnut", value: "#5C4033", fileSuffix: "walnut" },
];

export const BASIC_WALL_VARIANTS: ColorVariant[] = [
  { name: "Blue", value: "#64B5F6", fileSuffix: "blue" },
  { name: "Green", value: "#81C784", fileSuffix: "green" },
  { name: "Lime", value: "#DCE775", fileSuffix: "lime" },
  { name: "Orange", value: "#FFB74D", fileSuffix: "orange" },
  { name: "Pink", value: "#F06292", fileSuffix: "pink" },
  { name: "Purple", value: "#BA68C8", fileSuffix: "purple" },
  { name: "Red", value: "#E57373", fileSuffix: "red" },
  { name: "Teal", value: "#4DB6AC", fileSuffix: "teal" },
  { name: "Yellow", value: "#FFF176", fileSuffix: "yellow" },
];

export const CLASSIC_VARIANTS: ColorVariant[] = [
  { name: "Lemonlime", value: "#CDDC39", fileSuffix: "lemonlime" },
  { name: "Ocean", value: "#2196F3", fileSuffix: "ocean" },
  { name: "Slushie", value: "#E91E63", fileSuffix: "slushie" },
  { name: "Sunset", value: "#FF9800", fileSuffix: "sunset" },
];

export const ITEM_VARIANTS: Record<string, ColorVariant[]> = {
  "deco-basic-floor": WOOD_VARIANTS,
  "deco-basic-ceiling": WOOD_VARIANTS,
  "deco-wood-paneling-overlay": WOOD_VARIANTS,
  "deco-basic-wall": BASIC_WALL_VARIANTS,
  "deco-classic-wall": CLASSIC_VARIANTS,
  "deco-classic-ceiling": CLASSIC_VARIANTS,
  "deco-basic-trim": WOOD_VARIANTS,
};

// Helper to check if an item has variants
export const getItemVariants = (itemId: string): ColorVariant[] | undefined => {
  return ITEM_VARIANTS[itemId];
};

// Helper to construct new src
export const getVariantSrc = (originalSrc: string, newSuffix: string): string => {
  // Regex to match the suffix before .png
  // Assumes format ends with -[color].png
  // We need to be careful not to replace the wrong part if filename has multiple dashes
  // But our known structure is consistent: name-color.png
  
  // We find the last dash before the extension
  const parts = originalSrc.split('-');
  if (parts.length < 2) return originalSrc; // Should not happen for these items
  
  // Replace the last part (excluding extension logic handles itself if we just split by - and pop)
  // Actually, split by '.' to separate extension first
  const dotParts = originalSrc.split('.');
  const ext = dotParts.pop();
  const baseWithoutExt = dotParts.join('.');
  
  const dashParts = baseWithoutExt.split('-');
  dashParts.pop(); // Remove the old color
  
  return `${dashParts.join('-')}-${newSuffix}.${ext}`;
};
