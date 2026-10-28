import { describe, expect, it } from 'vitest';
import { detectSlotFromAlpha, type AlphaMask } from './slot-detect';

function createBuffer(
  width: number,
  height: number,
  hole?: { x: number; y: number; width: number; height: number },
  defaultAlpha = 255,
): AlphaMask {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;

      const isInsideHole =
        hole &&
        x >= hole.x &&
        x < hole.x + hole.width &&
        y >= hole.y &&
        y < hole.y + hole.height;

      data[idx + 3] = isInsideHole ? 0 : defaultAlpha;
    }
  }

  return { width, height, data };
}

describe('detectSlotFromAlpha', () => {
  it('detects centered hole in an opaque template', () => {
    const mask = createBuffer(100, 100, { x: 25, y: 25, width: 50, height: 50 });
    const slot = detectSlotFromAlpha(mask);

    expect(slot).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    });
  });

  it('detects offset hole', () => {
    const mask = createBuffer(200, 100, { x: 20, y: 10, width: 120, height: 50 });
    const slot = detectSlotFromAlpha(mask);

    expect(slot).toEqual({
      x: 0.1,
      y: 0.1,
      width: 0.6,
      height: 0.5,
    });
  });

  it('detects hole touching an edge', () => {
    const leftMask = createBuffer(100, 100, { x: 0, y: 20, width: 50, height: 60 });
    const leftSlot = detectSlotFromAlpha(leftMask);

    expect(leftSlot).toEqual({
      x: 0,
      y: 0.2,
      width: 0.5,
      height: 0.6,
    });

    const rightBottomMask = createBuffer(100, 100, { x: 50, y: 40, width: 50, height: 60 });
    const rightBottomSlot = detectSlotFromAlpha(rightBottomMask);

    expect(rightBottomSlot).toEqual({
      x: 0.5,
      y: 0.4,
      width: 0.5,
      height: 0.6,
    });
  });

  it('returns null when template image is completely opaque', () => {
    const mask = createBuffer(100, 100);
    expect(detectSlotFromAlpha(mask)).toBeNull();
  });

  it('returns null when template image is fully transparent', () => {
    const mask = createBuffer(100, 100, undefined, 0);
    expect(detectSlotFromAlpha(mask)).toBeNull();
  });

  it('ignores isolated stray transparent pixels outside the main hole', () => {
    const mask = createBuffer(100, 100, { x: 25, y: 25, width: 50, height: 50 });

    // Stray transparent pixels (alpha = 0)
    const stray1 = (5 * 100 + 5) * 4 + 3;
    const stray2 = (95 * 100 + 95) * 4 + 3;
    (mask.data as Uint8ClampedArray)[stray1] = 0;
    (mask.data as Uint8ClampedArray)[stray2] = 0;

    const slot = detectSlotFromAlpha(mask);

    expect(slot).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    });
  });

  it('returns null on zero-size or short buffer', () => {
    expect(detectSlotFromAlpha({ width: 0, height: 100, data: new Uint8Array(400) })).toBeNull();
    expect(detectSlotFromAlpha({ width: 100, height: 0, data: new Uint8Array(400) })).toBeNull();
    expect(detectSlotFromAlpha({ width: -10, height: 10, data: new Uint8Array(400) })).toBeNull();
    expect(
      detectSlotFromAlpha({
        width: 10,
        height: 10,
        data: new Uint8Array(10),
      }),
    ).toBeNull();
  });

  it('respects custom alphaThreshold', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const inHole = x >= 20 && x < 80 && y >= 20 && y < 80;
        data[idx + 3] = inHole ? 15 : 255;
      }
    }

    // With default threshold (0), alpha 15 is not considered transparent
    expect(detectSlotFromAlpha({ width, height, data })).toBeNull();

    // With threshold 20, alpha 15 is transparent
    const slot = detectSlotFromAlpha({ width, height, data }, 20);
    expect(slot).toEqual({
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
    });
  });
});
