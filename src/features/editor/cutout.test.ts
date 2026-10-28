import { describe, expect, it } from 'vitest';
import {
  autoEraseBackground,
  cloneMask,
  createMask,
  magicWandErase,
  maskCoverage,
  strokeMask,
} from './cutout';
import type { CutoutMask } from '../../types/editor';

function makeRgba(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = fill(x, y);
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }
  return pixels;
}

describe('cutout domain logic', () => {
  it('creates mask with full opacity and clones independently', () => {
    const mask = createMask(4, 3);
    expect(mask.width).toBe(4);
    expect(mask.height).toBe(3);
    expect(mask.alpha.length).toBe(12);
    for (let i = 0; i < mask.alpha.length; i++) {
      expect(mask.alpha[i]).toBe(255);
    }

    const clone = cloneMask(mask);
    expect(clone.width).toBe(mask.width);
    expect(clone.height).toBe(mask.height);
    expect(clone.alpha).not.toBe(mask.alpha);
    expect(Array.from(clone.alpha)).toEqual(Array.from(mask.alpha));

    clone.alpha[0] = 0;
    expect(mask.alpha[0]).toBe(255);
  });

  it('erases contiguous matching region with magicWandErase and returns false on repeat', () => {
    const width = 5;
    const height = 5;
    const pixels = makeRgba(width, height, (x) =>
      x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255],
    );
    const mask = createMask(width, height);

    const changed = magicWandErase(mask, pixels, width, height, 0, 0, 0.05);
    expect(changed).toBe(true);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (x < 2) {
          expect(mask.alpha[idx]).toBe(0);
        } else {
          expect(mask.alpha[idx]).toBe(255);
        }
      }
    }

    const repeatChanged = magicWandErase(mask, pixels, width, height, 0, 0, 0.05);
    expect(repeatChanged).toBe(false);
  });

  it('returns false and keeps mask untouched when magicWandErase seed is out of bounds', () => {
    const width = 4;
    const height = 4;
    const pixels = makeRgba(width, height, () => [255, 0, 0, 255]);
    const mask = createMask(width, height);
    const originalAlpha = Array.from(mask.alpha);

    expect(magicWandErase(mask, pixels, width, height, -1, 0, 0.05)).toBe(false);
    expect(magicWandErase(mask, pixels, width, height, 0, -1, 0.05)).toBe(false);
    expect(magicWandErase(mask, pixels, width, height, width, 0, 0.05)).toBe(false);
    expect(magicWandErase(mask, pixels, width, height, 0, height, 0.05)).toBe(false);
    expect(Array.from(mask.alpha)).toEqual(originalAlpha);
  });

  it('erases only contiguous island and leaves separated matching island intact', () => {
    const width = 5;
    const height = 1;
    // Island 1: x in [0, 1] (red)
    // Divider:  x === 2       (blue)
    // Island 2: x in [3, 4]   (red)
    const pixels = makeRgba(width, height, (x) => {
      if (x === 2) return [0, 0, 255, 255];
      return [255, 0, 0, 255];
    });
    const mask = createMask(width, height);

    const changed = magicWandErase(mask, pixels, width, height, 0, 0, 0.05);
    expect(changed).toBe(true);

    expect(mask.alpha[0]).toBe(0);
    expect(mask.alpha[1]).toBe(0);
    expect(mask.alpha[2]).toBe(255);
    expect(mask.alpha[3]).toBe(255);
    expect(mask.alpha[4]).toBe(255);
  });

  it('distinguishes strict equality at tolerance 0 from near shades at higher tolerance', () => {
    const width = 2;
    const height = 1;
    const pixels = makeRgba(width, height, (x) =>
      x === 0 ? [200, 0, 0, 255] : [210, 0, 0, 255],
    );

    const strictMask = createMask(width, height);
    magicWandErase(strictMask, pixels, width, height, 0, 0, 0);
    expect(strictMask.alpha[0]).toBe(0);
    expect(strictMask.alpha[1]).toBe(255);

    const relaxedMask = createMask(width, height);
    magicWandErase(relaxedMask, pixels, width, height, 0, 0, 0.05);
    expect(relaxedMask.alpha[0]).toBe(0);
    expect(relaxedMask.alpha[1]).toBe(0);
  });

  it('erases all background pixels matching border average including non-contiguous center', () => {
    const width = 5;
    const height = 5;
    // Border ring (x=0,4 or y=0,4): (20, 20, 20)
    // Inner ring: (200, 200, 200)
    // Center pixel (2, 2): (20, 20, 20) - matches border but disconnected
    const pixels = makeRgba(width, height, (x, y) => {
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      const isCenter = x === 2 && y === 2;
      if (isBorder || isCenter) return [20, 20, 20, 255];
      return [200, 200, 200, 255];
    });
    const mask = createMask(width, height);

    const erasedCount = autoEraseBackground(mask, pixels, width, height, 0.05);
    // Border pixels = 16, center pixel = 1 -> total 17
    expect(erasedCount).toBe(17);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
        const isCenter = x === 2 && y === 2;
        if (isBorder || isCenter) {
          expect(mask.alpha[idx]).toBe(0);
        } else {
          expect(mask.alpha[idx]).toBe(255);
        }
      }
    }
  });

  it('strokes along segment with keep=false and restores with keep=true', () => {
    const width = 10;
    const height = 10;
    const mask = createMask(width, height);

    strokeMask(mask, { x: 2, y: 5 }, { x: 8, y: 5 }, 1, false);

    expect(mask.alpha[5 * width + 2]).toBe(0);
    expect(mask.alpha[5 * width + 5]).toBe(0);
    expect(mask.alpha[5 * width + 8]).toBe(0);
    expect(mask.alpha[0 * width + 5]).toBe(255);

    strokeMask(mask, { x: 2, y: 5 }, { x: 8, y: 5 }, 1, true);

    expect(mask.alpha[5 * width + 2]).toBe(255);
    expect(mask.alpha[5 * width + 5]).toBe(255);
    expect(mask.alpha[5 * width + 8]).toBe(255);
  });

  it('leaves mask unchanged when strokeMask radiusPx is zero or negative', () => {
    const width = 6;
    const height = 6;
    const mask = createMask(width, height);
    const originalAlpha = Array.from(mask.alpha);

    strokeMask(mask, { x: 1, y: 1 }, { x: 4, y: 4 }, 0, false);
    expect(Array.from(mask.alpha)).toEqual(originalAlpha);

    strokeMask(mask, { x: 1, y: 1 }, { x: 4, y: 4 }, -2, false);
    expect(Array.from(mask.alpha)).toEqual(originalAlpha);
  });

  it('computes coverage accurately for full, empty, and partial masks', () => {
    const full = createMask(4, 4);
    expect(maskCoverage(full)).toBe(1);

    const empty = createMask(4, 4);
    empty.alpha.fill(0);
    expect(maskCoverage(empty)).toBe(0);

    const half = createMask(4, 4);
    for (let i = 0; i < 8; i++) {
      half.alpha[i] = 0;
    }
    expect(maskCoverage(half)).toBeCloseTo(0.5, 2);
  });

  it('does not throw on malformed mask with shorter alpha buffer', () => {
    const malformedMask: CutoutMask = {
      width: 10,
      height: 10,
      alpha: new Uint8ClampedArray(4),
    };

    expect(() => maskCoverage(malformedMask)).not.toThrow();
    expect(() =>
      strokeMask(malformedMask, { x: 0, y: 0 }, { x: 5, y: 5 }, 2, false),
    ).not.toThrow();
  });
});
