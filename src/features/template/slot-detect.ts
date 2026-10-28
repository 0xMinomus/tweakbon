import type { SlotRect } from '../../types/template';

export interface AlphaMask {
  data: ArrayLike<number>; // RGBA, 4 bytes per pixel
  width: number;
  height: number;
}

export function detectSlotFromAlpha(mask: AlphaMask, alphaThreshold = 0): SlotRect | null {
  const { width, height, data } = mask;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return null;
  }

  const expectedLength = width * height * 4;
  if (!data || data.length < expectedLength) {
    return null;
  }

  const threshold = Number.isFinite(alphaThreshold) ? alphaThreshold : 0;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * 4 + 3];
      if (alpha > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    return null;
  }

  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}
