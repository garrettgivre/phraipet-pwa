export async function calculateVisibleBounds(imageSrc: string): Promise<{ x: number; y: number; width: number; height: number; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => { // reject is now used
    const img = new Image();
    
    // Only use crossOrigin if it's likely needed (not for data URIs or relative paths)
    // Actually for local development with Vite, "anonymous" is usually fine, but 
    // for some file serving setups it can cause issues. 
    // We'll keep it but be aware.
    img.crossOrigin = "anonymous"; 

    img.src = imageSrc;

    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      // If image has no dimensions, or it's an error case for some browsers
      if (naturalWidth === 0 || naturalHeight === 0) {
        console.warn("Image has zero dimensions, resolving with zero bounds:", imageSrc);
        // Still resolve with zero dimensions, as this isn't a load failure per se, but an image issue.
        // The caller (ZoomedImage) should handle this case.
        resolve({ x: 0, y: 0, width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      
      if (!ctx) {
        // Fallback if context cannot be obtained (should be rare)
        console.warn("Canvas context could not be obtained for:", imageSrc);
        // Resolve with natural dimensions as a fallback if canvas fails.
        resolve({ x: 0, y: 0, width: naturalWidth, height: naturalHeight, naturalWidth, naturalHeight });
        return;
      }

      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
        const data = imageData.data;
        let top = naturalHeight, left = naturalWidth, right = 0, bottom = 0;
        let foundPixel = false;
        
        // Increased threshold to ignore compression artifacts or very faint shadows
        const ALPHA_THRESHOLD = 15;

        for (let yPos = 0; yPos < naturalHeight; yPos++) {
          for (let xPos = 0; xPos < naturalWidth; xPos++) {
            const index = (yPos * naturalWidth + xPos) * 4;
            const alpha = data[index + 3];
            if (alpha > ALPHA_THRESHOLD) { 
              foundPixel = true;
              if (xPos < left) left = xPos;
              if (xPos > right) right = xPos;
              if (yPos < top) top = yPos;
              if (yPos > bottom) bottom = yPos;
            }
          }
        }
        
        if (!foundPixel) { // Handle fully transparent or empty images
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
        console.error("Canvas getImageData error (possibly CORS related for image):", imageSrc, e);
        // Fallback to using natural dimensions if canvas inspection fails.
        resolve({ x: 0, y: 0, width: naturalWidth, height: naturalHeight, naturalWidth, naturalHeight });
      }
    };

    img.onerror = () => {
      console.error("Failed to load image for bounds calculation:", imageSrc);
      // Use reject to signal a failure in loading the image.
      reject(new Error(`Failed to load image: ${imageSrc}`));
    };
  });
}