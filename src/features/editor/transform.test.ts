import { describe, expect, it } from 'vitest';
import {
  MAX_SCALE,
  MIN_SCALE,
  clampTransform,
  createTransform,
  drawSizeInSlot,
  isUncovered,
  reduceTransform,
  type TransformContext,
} from './transform';
import type { TransformState } from '../../types/editor';

describe('createTransform', () => {
  it('returns default identity transform', () => {
    const t = createTransform();
    expect(t).toEqual({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
      flipX: false,
    });
  });
});

describe('drawSizeInSlot', () => {
  it('computes dimensions for wide media (mediaAspect >= slotAspect)', () => {
    const draw = drawSizeInSlot(200, 100, 1, 1);
    expect(draw.width).toBeCloseTo(2);
    expect(draw.height).toBeCloseTo(1);
  });

  it('computes dimensions for tall media (mediaAspect < slotAspect)', () => {
    const draw = drawSizeInSlot(100, 200, 1, 1);
    expect(draw.width).toBeCloseTo(1);
    expect(draw.height).toBeCloseTo(2);
  });

  it('computes dimensions for exact aspect media', () => {
    const draw = drawSizeInSlot(150, 150, 1, 1);
    expect(draw.width).toBeCloseTo(1);
    expect(draw.height).toBeCloseTo(1);
  });

  it('scales dimensions proportionally with scale factor', () => {
    const draw = drawSizeInSlot(200, 100, 1, 2.5);
    expect(draw.width).toBeCloseTo(5);
    expect(draw.height).toBeCloseTo(2.5);
  });

  it('handles non-square slot aspect ratio correctly', () => {
    const draw = drawSizeInSlot(100, 100, 2, 1);
    expect(draw.width).toBeCloseTo(1);
    expect(draw.height).toBeCloseTo(2);
  });

  it('falls back safely on non-positive dimensions', () => {
    expect(drawSizeInSlot(0, 100, 1, 1)).toEqual({ width: 1, height: 1 });
    expect(drawSizeInSlot(100, -5, 1, 2)).toEqual({ width: 2, height: 2 });
    expect(drawSizeInSlot(100, 100, 0, 1)).toEqual({ width: 1, height: 1 });
  });
});

describe('clampTransform', () => {
  it('clamps scale within MIN_SCALE (0.5) and MAX_SCALE (4)', () => {
    expect(MIN_SCALE).toBe(0.5);

    const below = clampTransform({ ...createTransform(), scale: 0.2 }, { width: 1, height: 1 });
    expect(below.scale).toBe(0.5);

    const atMin = clampTransform({ ...createTransform(), scale: 0.5 }, { width: 0.5, height: 0.5 });
    expect(atMin.scale).toBe(0.5);

    const above = clampTransform({ ...createTransform(), scale: 9 }, { width: 1, height: 1 });
    expect(above.scale).toBe(MAX_SCALE);
    expect(above.scale).toBe(4);
  });

  it('centers offsets while uncovered at scale 0.5', () => {
    const draw = { width: 0.5, height: 0.5 };
    const clamped = clampTransform(
      { ...createTransform(), scale: 0.5, offsetX: 0.4, offsetY: -0.3 },
      draw,
    );
    expect(clamped.scale).toBe(0.5);
    expect(clamped.offsetX).toBe(0);
    expect(clamped.offsetY).toBe(0);
  });

  it('clamps offset at positive and negative edges', () => {
    const draw = { width: 2, height: 1 };
    const positiveClamp = clampTransform(
      { ...createTransform(), offsetX: 5, offsetY: 5 },
      draw,
    );
    expect(positiveClamp.offsetX).toBeCloseTo(0.5);
    expect(positiveClamp.offsetY).toBeCloseTo(0);

    const negativeClamp = clampTransform(
      { ...createTransform(), offsetX: -5, offsetY: -5 },
      draw,
    );
    expect(negativeClamp.offsetX).toBeCloseTo(-0.5);
    expect(negativeClamp.offsetY).toBeCloseTo(0);
  });

  it('centers offset to 0 when bounding box is below 1', () => {
    const clamped = clampTransform(
      { ...createTransform(), offsetX: 0.3, offsetY: -0.4 },
      { width: 0.8, height: 0.8 },
    );
    expect(clamped.offsetX).toBe(0);
    expect(clamped.offsetY).toBe(0);
  });

  it('rotation expands bounding box and widens allowed offset range', () => {
    const draw = { width: 1, height: 1 };
    const unrotated = clampTransform(
      { ...createTransform(), offsetX: 0.1, rotation: 0 },
      draw,
    );
    expect(unrotated.offsetX).toBe(0);

    const rotated = clampTransform(
      { ...createTransform(), offsetX: 0.1, rotation: Math.PI / 4 },
      draw,
    );
    expect(rotated.offsetX).toBeCloseTo(0.1);
  });
});

describe('isUncovered', () => {
  it('returns true at scale 0.5 (smaller than slot)', () => {
    const transform = { ...createTransform(), scale: 0.5 };
    const draw = drawSizeInSlot(100, 100, 1, 0.5);
    expect(isUncovered(transform, draw)).toBe(true);
  });

  it('returns false at scale 1 (covers slot exactly)', () => {
    const transform = { ...createTransform(), scale: 1 };
    const draw = drawSizeInSlot(100, 100, 1, 1);
    expect(isUncovered(transform, draw)).toBe(false);
  });

  it('returns false at scale 2 (covers slot with margin)', () => {
    const transform = { ...createTransform(), scale: 2 };
    const draw = drawSizeInSlot(100, 100, 1, 2);
    expect(isUncovered(transform, draw)).toBe(false);
  });

  it('returns true when only one axis is smaller than 1', () => {
    const transform = { ...createTransform(), scale: 0.6 };
    const wideDraw = { width: 1.2, height: 0.6 };
    expect(isUncovered(transform, wideDraw)).toBe(true);

    const tallDraw = { width: 0.6, height: 1.2 };
    expect(isUncovered(transform, tallDraw)).toBe(true);
  });

  it('accounts for rotation expanding bounding box', () => {
    const unrotated = { ...createTransform(), scale: 0.8, rotation: 0 };
    const rotated = { ...createTransform(), scale: 0.8, rotation: Math.PI / 4 };
    const draw = { width: 0.8, height: 0.8 };

    expect(isUncovered(unrotated, draw)).toBe(true);
    expect(isUncovered(rotated, draw)).toBe(false);
  });
});


describe('reduceTransform', () => {
  const context: TransformContext = {
    mediaWidth: 200,
    mediaHeight: 100,
    slotAspect: 1,
  };

  it('accumulates drag and clamps against context', () => {
    let state = reduceTransform(
      createTransform(),
      { type: 'scale', scale: 2 },
      context,
    );

    state = reduceTransform(state, { type: 'drag', deltaX: 0.2, deltaY: 0.1 }, context);
    expect(state.offsetX).toBeCloseTo(0.2);
    expect(state.offsetY).toBeCloseTo(0.1);

    state = reduceTransform(state, { type: 'drag', deltaX: 0.2, deltaY: 0.1 }, context);
    expect(state.offsetX).toBeCloseTo(0.4);
    expect(state.offsetY).toBeCloseTo(0.2);
  });

  it('clamps drag when exceeding boundaries', () => {
    const state = reduceTransform(
      createTransform(),
      { type: 'drag', deltaX: 10, deltaY: 10 },
      context,
    );
    expect(state.offsetX).toBeCloseTo(0.5);
    expect(state.offsetY).toBeCloseTo(0);
  });

  it('sets absolute scale and resets NaN to MIN_SCALE', () => {
    const scaled = reduceTransform(
      createTransform(),
      { type: 'scale', scale: 3 },
      context,
    );
    expect(scaled.scale).toBe(3);

    const nanScaled = reduceTransform(
      scaled,
      { type: 'scale', scale: Number.NaN },
      context,
    );
    expect(nanScaled.scale).toBe(MIN_SCALE);
  });
  it('clamps zoom out to MIN_SCALE (0.5) and keeps offsets centered when uncovered', () => {
    const squareContext: TransformContext = {
      mediaWidth: 100,
      mediaHeight: 100,
      slotAspect: 1,
    };

    const zoomedOut = reduceTransform(
      createTransform(),
      { type: 'scale', scale: 0.5 },
      squareContext,
    );
    expect(zoomedOut.scale).toBe(0.5);
    expect(zoomedOut.offsetX).toBe(0);
    expect(zoomedOut.offsetY).toBe(0);

    const belowMin = reduceTransform(
      createTransform(),
      { type: 'scale', scale: 0.1 },
      squareContext,
    );
    expect(belowMin.scale).toBe(0.5);

    // Drag while uncovered should remain centered at 0
    const dragged = reduceTransform(
      zoomedOut,
      { type: 'drag', deltaX: 0.3, deltaY: -0.3 },
      squareContext,
    );
    expect(dragged.offsetX).toBe(0);
    expect(dragged.offsetY).toBe(0);
  });


  it('normalizes rotation into [0, 2pi)', () => {
    const r1 = reduceTransform(
      createTransform(),
      { type: 'rotate', deltaRadians: Math.PI / 2 },
      context,
    );
    expect(r1.rotation).toBeCloseTo(Math.PI / 2);

    const r2 = reduceTransform(
      r1,
      { type: 'rotate', deltaRadians: 2 * Math.PI },
      context,
    );
    expect(r2.rotation).toBeCloseTo(Math.PI / 2);

    const r3 = reduceTransform(
      createTransform(),
      { type: 'rotate', deltaRadians: -Math.PI / 2 },
      context,
    );
    expect(r3.rotation).toBeCloseTo((3 * Math.PI) / 2);
    expect(r3.rotation).toBeGreaterThanOrEqual(0);
    expect(r3.rotation).toBeLessThan(2 * Math.PI);
  });

  it('toggles flipX and preserves clamping', () => {
    const initial = createTransform();
    const flipped = reduceTransform(initial, { type: 'flip' }, context);
    expect(flipped.flipX).toBe(true);

    const flippedBack = reduceTransform(flipped, { type: 'flip' }, context);
    expect(flippedBack.flipX).toBe(false);
  });

  it('resets state to createTransform defaults', () => {
    let state: TransformState = {
      offsetX: 0.3,
      offsetY: 0.1,
      scale: 3,
      rotation: 1.2,
      flipX: true,
    };

    state = reduceTransform(state, { type: 'reset' }, context);
    expect(state).toEqual(createTransform());
  });
});
