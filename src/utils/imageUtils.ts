export async function calculateVisibleBounds(imageSrc: string): Promise<{ x: number; y: number; width: number; height: number; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous"; // Important for canvas operations if images are from different origins

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      if (!ctx) {
        // Fallback if context cannot be obtained (should be rare)
        return resolve({ x: 0, y: 0, width: naturalWidth, height: naturalHeight, naturalWidth, naturalHeight });
      }

      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
        const data = imageData.data;
        let top = naturalHeight, left = naturalWidth, right = 0, bottom = 0;
        let foundPixel = false;

        for (let y = 0; y < naturalHeight; y++) {
          for (let x = 0; x < naturalWidth; x++) {
            const index = (y * naturalWidth + x) * 4;
            const alpha = data[index + 3];
            if (alpha > 0) { // Consider a pixel visible if alpha > 0
              foundPixel = true;
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        }
        
        if (!foundPixel) { // Handle fully transparent or empty images
            resolve({ x: 0, y: 0, width: 0, height: 0, naturalWidth, naturalHeight });
        } else {
            resolve({
                x: left,
                y: top,
                width: right - left + 1,
                height: bottom - top + 1,
                naturalWidth,
                naturalHeight,
            });
        }
      } catch (e) {
        console.error("Canvas getImageData error (possibly CORS related for image):", imageSrc, e);
        // Fallback to using natural dimensions if canvas inspection fails
        resolve({ x: 0, y: 0, width: naturalWidth, height: naturalHeight, naturalWidth, naturalHeight });
      }
    };
    img.onerror = () => {
      console.error("Failed to load image for bounds calculation:", imageSrc);
      reject(new Error(`Failed to load image: ${imageSrc}`));
    };
  });
}