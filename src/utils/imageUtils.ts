import { InventoryItem } from '../types';

export const preloadImages = async (items: InventoryItem[]): Promise<void> => {
  const imagePromises = items.map(item => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${item.src}`));
      img.src = item.src;
    });
  });

  try {
    await Promise.all(imagePromises);
    console.log(`Successfully preloaded ${items.length} images`);
  } catch (error) {
    console.error('Error preloading images:', error);
  }
}; 