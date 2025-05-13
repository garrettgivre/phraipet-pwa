export async function calculateVisibleBounds(imageSrc: string): Promise<{ x: number; y: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous"; // Allow cross-origin if needed

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ x: 0, y: 0, width: img.width, height: img.height });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
      let top = height, left = width, right = 0, bottom = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const alpha = data[index + 3];
          if (alpha > 0) {
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
      }

      const bounds = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };

      resolve(bounds);
    };
  });
}
