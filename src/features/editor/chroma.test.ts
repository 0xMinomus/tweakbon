import { describe, expect, it } from 'vitest';
import {
  CHROMA_LUT_SIZE,
  DEFAULT_CHROMA_KEY,
  buildChromaKeyLut,
  chromaKeyAlpha,
  despill,
  lookupChromaAlpha,
} from './chroma';
import type { ChromaKeySettings } from '../../types/editor';

describe('chroma key domain logic', () => {
  it('provides default settings with enabled false and sliders in 0..1 range', () => {
    expect(DEFAULT_CHROMA_KEY.enabled).toBe(false);
    expect(DEFAULT_CHROMA_KEY.similarity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CHROMA_KEY.similarity).toBeLessThanOrEqual(1);
    expect(DEFAULT_CHROMA_KEY.smoothness).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CHROMA_KEY.smoothness).toBeLessThanOrEqual(1);
    expect(DEFAULT_CHROMA_KEY.spill).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CHROMA_KEY.spill).toBeLessThanOrEqual(1);
    expect(DEFAULT_CHROMA_KEY.color).toBeDefined();
    expect(DEFAULT_CHROMA_KEY.color.r).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CHROMA_KEY.color.r).toBeLessThanOrEqual(255);
    expect(DEFAULT_CHROMA_KEY.color.g).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CHROMA_KEY.color.g).toBeLessThanOrEqual(255);
    expect(DEFAULT_CHROMA_KEY.color.b).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CHROMA_KEY.color.b).toBeLessThanOrEqual(255);
  });

  it('returns 0 alpha for exact key color and 255 for distant complementary color', () => {
    const settings: ChromaKeySettings = {
      enabled: true,
      color: { r: 0, g: 255, b: 0 },
      similarity: 0.3,
      smoothness: 0.1,
      spill: 0.2,
    };

    expect(chromaKeyAlpha(0, 255, 0, settings)).toBe(0);
    expect(chromaKeyAlpha(255, 0, 255, settings)).toBe(255);
  });

  it('guarantees monotonic non-decreasing alpha as color distance increases', () => {
    const settings: ChromaKeySettings = {
      enabled: true,
      color: { r: 0, g: 255, b: 0 },
      similarity: 0.15,
      smoothness: 0.4,
      spill: 0.2,
    };

    // Distances from key (0, 255, 0) strictly increase: d1 < d2 < d3
    const a1 = chromaKeyAlpha(0, 220, 0, settings);
    const a2 = chromaKeyAlpha(0, 160, 0, settings);
    const a3 = chromaKeyAlpha(100, 50, 100, settings);

    expect(a1).toBeLessThanOrEqual(a2);
    expect(a2).toBeLessThanOrEqual(a3);
  });

  it('provides sharp step transition when smoothness is 0 and soft intermediate zone when smoothness > 0', () => {
    const sharpSettings: ChromaKeySettings = {
      enabled: true,
      color: { r: 0, g: 255, b: 0 },
      similarity: 0.25,
      smoothness: 0,
      spill: 0,
    };

    const gSamples = [0, 50, 100, 150, 180, 200, 230, 255];
    for (const g of gSamples) {
      const alpha = chromaKeyAlpha(0, g, 0, sharpSettings);
      expect(alpha === 0 || alpha === 255).toBe(true);
    }

    const softSettings: ChromaKeySettings = {
      ...sharpSettings,
      smoothness: 0.5,
    };
    let foundIntermediate = false;
    for (let g = 0; g <= 255; g += 5) {
      const alpha = chromaKeyAlpha(0, g, 0, softSettings);
      if (alpha > 0 && alpha < 255) {
        foundIntermediate = true;
        break;
      }
    }
    expect(foundIntermediate).toBe(true);
  });

  it('builds 32768-entry LUT with lookup matching direct calculation within quantization tolerance', () => {
    expect(CHROMA_LUT_SIZE).toBe(32);
    const settings: ChromaKeySettings = {
      enabled: true,
      color: { r: 0, g: 255, b: 0 },
      similarity: 0.3,
      smoothness: 0.2,
      spill: 0.1,
    };

    const lut = buildChromaKeyLut(settings);
    expect(lut.length).toBe(32768);

    const testColors: [number, number, number][] = [
      [0, 255, 0],
      [10, 240, 15],
      [120, 180, 40],
      [255, 0, 0],
      [200, 200, 200],
      [64, 128, 192],
    ];

    for (const [r, g, b] of testColors) {
      const direct = chromaKeyAlpha(r, g, b, settings);
      const fromLut = lookupChromaAlpha(lut, r, g, b);
      expect(Math.abs(fromLut - direct)).toBeLessThanOrEqual(3);
    }
  });

  it('returns 255 without throwing when lookupChromaAlpha receives invalid LUT length', () => {
    const invalidLut = new Uint8ClampedArray(100);
    expect(() => lookupChromaAlpha(invalidLut, 0, 255, 0)).not.toThrow();
    expect(lookupChromaAlpha(invalidLut, 0, 255, 0)).toBe(255);
    expect(lookupChromaAlpha(new Uint8ClampedArray(0), 100, 100, 100)).toBe(255);
  });

  it('returns unchanged RGB when despill has spill = 0', () => {
    const settings: ChromaKeySettings = {
      enabled: true,
      color: { r: 0, g: 255, b: 0 },
      similarity: 0.3,
      smoothness: 0.2,
      spill: 0,
    };

    expect(despill(40, 200, 50, settings)).toEqual([40, 200, 50]);
    expect(despill(0, 255, 0, settings)).toEqual([0, 255, 0]);
    expect(despill(255, 128, 64, settings)).toEqual([255, 128, 64]);
  });

  it('reduces green channel on greenish pixels with green key while preserving neutral black and white', () => {
    const settings: ChromaKeySettings = {
      enabled: true,
      color: { r: 0, g: 255, b: 0 },
      similarity: 0.3,
      smoothness: 0.2,
      spill: 0.75,
    };

    const [, g] = despill(30, 210, 40, settings);
    expect(g).toBeLessThan(210);

    const neutralBlack = despill(0, 0, 0, settings);
    expect(neutralBlack).toEqual([0, 0, 0]);

    const neutralWhite = despill(255, 255, 255, settings);
    expect(neutralWhite).toEqual([255, 255, 255]);
  });
});
