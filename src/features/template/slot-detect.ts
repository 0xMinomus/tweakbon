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
  const totalPixels = width * height;

  const isTransparent = new Uint8Array(totalPixels);
  let transparentCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] <= threshold) {
      isTransparent[i] = 1;
      transparentCount++;
    }
  }

  if (transparentCount === 0 || transparentCount === totalPixels) {
    return null;
  }

  const parent = new Int32Array(totalPixels);
  const compMinX = new Int32Array(totalPixels);
  const compMaxX = new Int32Array(totalPixels);
  const compMinY = new Int32Array(totalPixels);
  const compMaxY = new Int32Array(totalPixels);
  const compCount = new Int32Array(totalPixels);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      parent[idx] = idx;
      compMinX[idx] = x;
      compMaxX[idx] = x;
      compMinY[idx] = y;
      compMaxY[idx] = y;
      compCount[idx] = 1;
    }
  }

  function find(i: number): number {
    let root = i;
    while (root !== parent[root]) {
      root = parent[root];
    }
    let curr = i;
    while (curr !== root) {
      const next = parent[curr];
      parent[curr] = root;
      curr = next;
    }
    return root;
  }

  function union(i: number, j: number): void {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI === rootJ) {
      return;
    }

    if (compCount[rootI] >= compCount[rootJ]) {
      parent[rootJ] = rootI;
      compCount[rootI] += compCount[rootJ];
      if (compMinX[rootJ] < compMinX[rootI]) compMinX[rootI] = compMinX[rootJ];
      if (compMaxX[rootJ] > compMaxX[rootI]) compMaxX[rootI] = compMaxX[rootJ];
      if (compMinY[rootJ] < compMinY[rootI]) compMinY[rootI] = compMinY[rootJ];
      if (compMaxY[rootJ] > compMaxY[rootI]) compMaxY[rootI] = compMaxY[rootJ];
    } else {
      parent[rootI] = rootJ;
      compCount[rootJ] += compCount[rootI];
      if (compMinX[rootI] < compMinX[rootJ]) compMinX[rootI] = compMinX[rootJ];
      if (compMaxX[rootI] > compMaxX[rootI]) compMaxX[rootJ] = compMaxX[rootI];
      if (compMinY[rootI] < compMinY[rootJ]) compMinY[rootJ] = compMinY[rootI];
      if (compMaxY[rootI] > compMaxY[rootJ]) compMaxY[rootJ] = compMaxY[rootI];
    }
  }

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (!isTransparent[idx]) {
        continue;
      }
      if (x + 1 < width && isTransparent[idx + 1]) {
        union(idx, idx + 1);
      }
      if (y + 1 < height && isTransparent[idx + width]) {
        union(idx, idx + width);
      }
    }
  }

  let maxCount = 0;
  let bestRoot = -1;

  for (let i = 0; i < totalPixels; i++) {
    if (!isTransparent[i]) {
      continue;
    }
    const root = find(i);
    if (compCount[root] > maxCount) {
      maxCount = compCount[root];
      bestRoot = root;
    }
  }

  if (bestRoot === -1 || maxCount === 0) {
    return null;
  }

  const minX = compMinX[bestRoot];
  const maxX = compMaxX[bestRoot];
  const minY = compMinY[bestRoot];
  const maxY = compMaxY[bestRoot];

  if (minX === 0 && maxX === width - 1 && minY === 0 && maxY === height - 1) {
    return null;
  }

  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}
