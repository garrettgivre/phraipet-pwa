export async function calculateVisibleBounds(imageSrc: string): Promise<{ x: number; y: number; width: number; height: number; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      // If image has no dimensions, or it's an error case for some browsers
      if (naturalWidth === 0 || naturalHeight === 0) {
        console.warn("Image has zero dimensions:", imageSrc);
        return resolve({ x: 0, y: 0, width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
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
            if (alpha > 5) { // Consider a pixel visible if alpha is slightly above 0 to avoid faint edges
              foundPixel = true;
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        }
        
        if (!foundPixel) {
            resolve({ x: 0, y: 0, width: 0, height: 0, naturalWidth, naturalHeight });
        } else {
            resolve({
                x: left,
                y: top,
                width: Math.max(1, right - left + 1), // Ensure width/height are at least 1
                height: Math.max(1, bottom - top + 1),
                naturalWidth,
                naturalHeight,
            });
        }
      } catch (e) {
        console.error("Canvas getImageData error:", imageSrc, e);
        resolve({ x: 0, y: 0, width: naturalWidth, height: naturalHeight, naturalWidth, naturalHeight });
      }
    };
    img.onerror = () => {
      console.error("Failed to load image for bounds calculation:", imageSrc);
      // Resolve with zero dimensions or reject, depending on how you want to handle errors upstream
      resolve({ x: 0, y: 0, width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    };
  });
}