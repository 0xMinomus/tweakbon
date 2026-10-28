import { describe, expect, it } from 'vitest';
import { detectSlotFromAlpha, type AlphaMask } from '../src/features/template/slot-detect';

function createTemplateBuffer(
  width: number,
  height: number,
  hole?: { x: number; y: number; width: number; height: number },
): AlphaMask {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 255; // R
      data[idx + 1] = 255; // G
      data[idx + 2] = 255; // B

      const isInsideHole =
        hole &&
        x >= hole.x &&
        x < hole.x + hole.width &&
        y >= hole.y &&
        y < hole.y + hole.height;

      // Opaque template frame has alpha 255; transparent hole cutout has alpha 0
      data[idx + 3] = isInsideHole ? 0 : 255;
    }
  }

  return { width, height, data };
}

describe('detectSlotFromAlpha for custom templates', () => {
  it('detects centered transparent slot in an opaque template frame', () => {
    // 100x100 template with a centered 50x50 transparent hole at (25, 25)
    const mask = createTemplateBuffer(100, 100, {
      x: 25,
      y: 25,
      width: 50,
      height: 50,
    });

    const slot = detectSlotFromAlpha(mask);

    expect(slot).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    });
  });

  it('detects offset rectangular transparent slot', () => {
    // 200x100 template with transparent cutout from x=20..140 (width 120), y=10..60 (height 50)
    const mask = createTemplateBuffer(200, 100, {
      x: 20,
      y: 10,
      width: 120,
      height: 50,
    });

    const slot = detectSlotFromAlpha(mask);

    expect(slot).toEqual({
      x: 0.1,
      y: 0.1,
      width: 0.6,
      height: 0.5,
    });
  });

  it('returns null when template image has no transparency (completely opaque)', () => {
    // 100x100 fully opaque buffer with no transparent hole
    const mask = createTemplateBuffer(100, 100);

    const slot = detectSlotFromAlpha(mask);

    expect(slot).toBeNull();
  });
});
