import type { CutoutMask, MaskPoint } from '../../types/editor';

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((dr * dr + dg * dg + db * db) / 3) / 255;
}

export function createMask(width: number, height: number): CutoutMask {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  const alpha = new Uint8ClampedArray(w * h);
  alpha.fill(255);
  return { width: w, height: h, alpha };
}

export function cloneMask(mask: CutoutMask): CutoutMask {
  return {
    width: mask.width,
    height: mask.height,
    alpha: new Uint8ClampedArray(mask.alpha),
  };
}

export function magicWandErase(
  mask: CutoutMask,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  tolerance: number,
): boolean {
  if (
    width <= 0 ||
    height <= 0 ||
    seedX < 0 ||
    seedX >= width ||
    seedY < 0 ||
    seedY >= height ||
    !Number.isFinite(seedX) ||
    !Number.isFinite(seedY) ||
    pixels.length < width * height * 4 ||
    mask.alpha.length < width * height
  ) {
    return false;
  }

  const effectiveTolerance = Math.min(1, Math.max(0, tolerance));
  const totalPixels = width * height;
  const seedXInt = seedX | 0;
  const seedYInt = seedY | 0;
  const seedIdx = seedYInt * width + seedXInt;

  const seedAlpha = mask.alpha[seedIdx];
  if (seedAlpha === undefined || seedAlpha === 0) {
    return false;
  }

  const p0 = seedIdx * 4;
  const r0 = pixels[p0] ?? 0;
  const g0 = pixels[p0 + 1] ?? 0;
  const b0 = pixels[p0 + 2] ?? 0;

  const visited = new Uint8Array(totalPixels);
  const stack = new Int32Array(totalPixels);
  let stackPtr = 0;

  visited[seedIdx] = 1;
  stack[stackPtr++] = seedIdx;
  let changed = false;

  while (stackPtr > 0) {
    const idx = stack[--stackPtr] ?? 0;
    const px = idx % width;
    const py = (idx / width) | 0;

    const currentAlpha = mask.alpha[idx];
    if (currentAlpha !== undefined && currentAlpha > 0) {
      mask.alpha[idx] = 0;
      changed = true;
    }

    if (px > 0) {
      const nIdx = idx - 1;
      if (!visited[nIdx]) {
        visited[nIdx] = 1;
        const a = mask.alpha[nIdx];
        if (a !== undefined && a > 0) {
          const pi = nIdx * 4;
          if (
            colorDistance(
              pixels[pi] ?? 0,
              pixels[pi + 1] ?? 0,
              pixels[pi + 2] ?? 0,
              r0,
              g0,
              b0,
            ) <= effectiveTolerance
          ) {
            stack[stackPtr++] = nIdx;
          }
        }
      }
    }

    if (px < width - 1) {
      const nIdx = idx + 1;
      if (!visited[nIdx]) {
        visited[nIdx] = 1;
        const a = mask.alpha[nIdx];
        if (a !== undefined && a > 0) {
          const pi = nIdx * 4;
          if (
            colorDistance(
              pixels[pi] ?? 0,
              pixels[pi + 1] ?? 0,
              pixels[pi + 2] ?? 0,
              r0,
              g0,
              b0,
            ) <= effectiveTolerance
          ) {
            stack[stackPtr++] = nIdx;
          }
        }
      }
    }

    if (py > 0) {
      const nIdx = idx - width;
      if (!visited[nIdx]) {
        visited[nIdx] = 1;
        const a = mask.alpha[nIdx];
        if (a !== undefined && a > 0) {
          const pi = nIdx * 4;
          if (
            colorDistance(
              pixels[pi] ?? 0,
              pixels[pi + 1] ?? 0,
              pixels[pi + 2] ?? 0,
              r0,
              g0,
              b0,
            ) <= effectiveTolerance
          ) {
            stack[stackPtr++] = nIdx;
          }
        }
      }
    }

    if (py < height - 1) {
      const nIdx = idx + width;
      if (!visited[nIdx]) {
        visited[nIdx] = 1;
        const a = mask.alpha[nIdx];
        if (a !== undefined && a > 0) {
          const pi = nIdx * 4;
          if (
            colorDistance(
              pixels[pi] ?? 0,
              pixels[pi + 1] ?? 0,
              pixels[pi + 2] ?? 0,
              r0,
              g0,
              b0,
            ) <= effectiveTolerance
          ) {
            stack[stackPtr++] = nIdx;
          }
        }
      }
    }
  }

  return changed;
}

export function autoEraseBackground(
  mask: CutoutMask,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number,
): number {
  if (
    width <= 0 ||
    height <= 0 ||
    pixels.length < width * height * 4 ||
    mask.alpha.length < width * height
  ) {
    return 0;
  }

  const effectiveTolerance = Math.min(1, Math.max(0, tolerance));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let borderCount = 0;

  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    sumR += pixels[topIdx] ?? 0;
    sumG += pixels[topIdx + 1] ?? 0;
    sumB += pixels[topIdx + 2] ?? 0;
    borderCount++;

    if (height > 1) {
      const btmIdx = ((height - 1) * width + x) * 4;
      sumR += pixels[btmIdx] ?? 0;
      sumG += pixels[btmIdx + 1] ?? 0;
      sumB += pixels[btmIdx + 2] ?? 0;
      borderCount++;
    }
  }

  for (let y = 1; y < height - 1; y++) {
    const leftIdx = y * width * 4;
    sumR += pixels[leftIdx] ?? 0;
    sumG += pixels[leftIdx + 1] ?? 0;
    sumB += pixels[leftIdx + 2] ?? 0;
    borderCount++;

    if (width > 1) {
      const rightIdx = (y * width + (width - 1)) * 4;
      sumR += pixels[rightIdx] ?? 0;
      sumG += pixels[rightIdx + 1] ?? 0;
      sumB += pixels[rightIdx + 2] ?? 0;
      borderCount++;
    }
  }

  if (borderCount === 0) return 0;

  const avgR = sumR / borderCount;
  const avgG = sumG / borderCount;
  const avgB = sumB / borderCount;

  let erasedCount = 0;
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const a = mask.alpha[i];
    if (a !== undefined && a > 0) {
      const pIdx = i * 4;
      const d = colorDistance(
        pixels[pIdx] ?? 0,
        pixels[pIdx + 1] ?? 0,
        pixels[pIdx + 2] ?? 0,
        avgR,
        avgG,
        avgB,
      );
      if (d <= effectiveTolerance) {
        mask.alpha[i] = 0;
        erasedCount++;
      }
    }
  }

  return erasedCount;
}

export function strokeMask(
  mask: CutoutMask,
  from: MaskPoint,
  to: MaskPoint,
  radiusPx: number,
  keep: boolean,
): void {
  if (
    radiusPx < 0.5 ||
    !Number.isFinite(radiusPx) ||
    !Number.isFinite(from.x) ||
    !Number.isFinite(from.y) ||
    !Number.isFinite(to.x) ||
    !Number.isFinite(to.y) ||
    mask.width <= 0 ||
    mask.height <= 0
  ) {
    return;
  }

  const { width, height, alpha } = mask;
  const step = Math.max(1, radiusPx / 2);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.ceil(dist / step);
  const alphaValue = keep ? 255 : 0;
  const r2 = radiusPx * radiusPx;

  for (let s = 0; s <= steps; s++) {
    const t = steps === 0 ? 0 : s / steps;
    const cx = from.x + dx * t;
    const cy = from.y + dy * t;

    const minX = Math.max(0, Math.floor(cx - radiusPx));
    const maxX = Math.min(width - 1, Math.ceil(cx + radiusPx));
    const minY = Math.max(0, Math.floor(cy - radiusPx));
    const maxY = Math.min(height - 1, Math.ceil(cy + radiusPx));

    for (let y = minY; y <= maxY; y++) {
      const dy2 = (y - cy) * (y - cy);
      const rowOffset = y * width;
      for (let x = minX; x <= maxX; x++) {
        const dx2 = (x - cx) * (x - cx);
        if (dx2 + dy2 <= r2) {
          const idx = rowOffset + x;
          if (idx < alpha.length) {
            alpha[idx] = alphaValue;
          }
        }
      }
    }
  }
}

export function maskCoverage(mask: CutoutMask): number {
  if (mask.width <= 0 || mask.height <= 0 || mask.alpha.length === 0) {
    return 0;
  }
  const len = Math.min(mask.alpha.length, mask.width * mask.height);
  if (len <= 0) return 0;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    const a = mask.alpha[i];
    if (a !== undefined) {
      sum += a;
    }
  }
  return sum / (len * 255);
}
