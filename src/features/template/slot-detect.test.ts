import { describe, expect, it } from 'vitest';
import { detectSlotFromAlpha, type AlphaMask } from './slot-detect';

function createMask(
  width: number,
  height: number,
  fillAlpha = 0,
): { mask: AlphaMask; setPixel: (x: number, y: number, alpha: number) => void; fillRect: (x: number, y: number, w: number, h: number, alpha: number) => void } {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fillAlpha > 0) {
    for (let i = 3; i < data.length; i += 4) {
      data[i] = fillAlpha;
    }
  }

  const setPixel = (x: number, y: number, alpha: number) => {
    data[(y * width + x) * 4 + 3] = alpha;
  };

  const fillRect = (x: number, y: number, w: number, h: number, alpha: number) => {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        setPixel(px, py, alpha);
      }
    }
  };

  return { mask: { width, height, data }, setPixel, fillRect };
}

describe('detectSlotFromAlpha', () => {
  it('detects centered slot rectangle', () => {
    const { mask, fillRect } = createMask(100, 100, 0);
    fillRect(25, 25, 50, 50, 255);

    const slot = detectSlotFromAlpha(mask);
    expect(slot).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    });
  });

  it('detects edge-touching slot rectangle', () => {
    const { mask, fillRect } = createMask(100, 100, 0);
    fillRect(0, 0, 50, 100, 255);

    const slot = detectSlotFromAlpha(mask);
    expect(slot).toEqual({
      x: 0,
      y: 0,
      width: 0.5,
      height: 1,
    });

    const { mask: rightMask, fillRect: fillRight } = createMask(100, 100, 0);
    fillRight(50, 50, 50, 50, 255);
    const rightSlot = detectSlotFromAlpha(rightMask);
    expect(rightSlot).toEqual({
      x: 0.5,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    });
  });

  it('ignores sub-threshold alpha pixels', () => {
    const { mask, fillRect, setPixel } = createMask(100, 100, 0);
    fillRect(20, 20, 60, 60, 200);

    // Noisy background pixels below threshold
    setPixel(5, 5, 15);
    setPixel(95, 95, 10);

    const slot = detectSlotFromAlpha(mask, 50);
    expect(slot).toEqual({
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
    });

    const { mask: allSubMask, fillRect: fillAllSub } = createMask(50, 50, 0);
    fillAllSub(10, 10, 20, 20, 10);
    expect(detectSlotFromAlpha(allSubMask, 50)).toBeNull();
  });

  it('returns null on empty mask where all pixels have zero alpha', () => {
    const { mask } = createMask(60, 60, 0);
    expect(detectSlotFromAlpha(mask)).toBeNull();
  });

  it('returns null on zero-size or short buffer', () => {
    expect(detectSlotFromAlpha({ width: 0, height: 100, data: new Uint8Array(400) })).toBeNull();
    expect(detectSlotFromAlpha({ width: 100, height: 0, data: new Uint8Array(400) })).toBeNull();
    expect(detectSlotFromAlpha({ width: -10, height: 10, data: new Uint8Array(400) })).toBeNull();
    expect(
      detectSlotFromAlpha({
        width: 10,
        height: 10,
        data: new Uint8Array(10), // Needs 400 bytes, only has 10
      }),
    ).toBeNull();
  });
});
