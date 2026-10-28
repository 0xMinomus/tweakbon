import type { DrawSize, TransformState } from '../../types/editor';

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

export type TransformAction =
  | { type: 'drag'; deltaX: number; deltaY: number }
  | { type: 'scale'; scale: number }
  | { type: 'rotate'; deltaRadians: number }
  | { type: 'flip' }
  | { type: 'reset' };

export interface TransformContext {
  mediaWidth: number;
  mediaHeight: number;
  /** slot width / slot height, in template pixels */
  slotAspect: number;
}

export function createTransform(): TransformState {
  return {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
    flipX: false,
  };
}

export function drawSizeInSlot(
  mediaWidth: number,
  mediaHeight: number,
  slotAspect: number,
  scale: number,
): DrawSize {
  if (mediaWidth <= 0 || mediaHeight <= 0 || slotAspect <= 0) {
    const fallbackScale = Number.isFinite(scale) ? scale : MIN_SCALE;
    return { width: fallbackScale, height: fallbackScale };
  }

  const effectiveScale = Number.isFinite(scale) ? scale : MIN_SCALE;
  const mediaAspect = mediaWidth / mediaHeight;

  if (mediaAspect >= slotAspect) {
    return {
      width: (effectiveScale * mediaAspect) / slotAspect,
      height: effectiveScale,
    };
  }

  return {
    width: effectiveScale,
    height: (effectiveScale * slotAspect) / mediaAspect,
  };
}

export function clampTransform(transform: TransformState, draw: DrawSize): TransformState {
  const scale = Number.isFinite(transform.scale)
    ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale))
    : MIN_SCALE;

  const rotation = Number.isFinite(transform.rotation) ? transform.rotation : 0;
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));

  const w = Number.isFinite(draw.width) ? Math.max(0, draw.width) : 0;
  const h = Number.isFinite(draw.height) ? Math.max(0, draw.height) : 0;

  const bboxW = w * cos + h * sin;
  const bboxH = w * sin + h * cos;

  const maxOffsetX = bboxW < 1 ? 0 : (bboxW - 1) / 2;
  const maxOffsetY = bboxH < 1 ? 0 : (bboxH - 1) / 2;

  const rawX = Number.isFinite(transform.offsetX) ? transform.offsetX : 0;
  const rawY = Number.isFinite(transform.offsetY) ? transform.offsetY : 0;

  const offsetX = maxOffsetX === 0 ? 0 : Math.min(maxOffsetX, Math.max(-maxOffsetX, rawX));
  const offsetY = maxOffsetY === 0 ? 0 : Math.min(maxOffsetY, Math.max(-maxOffsetY, rawY));

  return {
    offsetX,
    offsetY,
    scale,
    rotation,
    flipX: Boolean(transform.flipX),
  };
}

export function reduceTransform(
  state: TransformState,
  action: TransformAction,
  context: TransformContext,
): TransformState {
  switch (action.type) {
    case 'reset': {
      const resetState = createTransform();
      const draw = drawSizeInSlot(
        context.mediaWidth,
        context.mediaHeight,
        context.slotAspect,
        resetState.scale,
      );
      return clampTransform(resetState, draw);
    }

    case 'drag': {
      const nextX =
        (Number.isFinite(state.offsetX) ? state.offsetX : 0) +
        (Number.isFinite(action.deltaX) ? action.deltaX : 0);
      const nextY =
        (Number.isFinite(state.offsetY) ? state.offsetY : 0) +
        (Number.isFinite(action.deltaY) ? action.deltaY : 0);
      const draw = drawSizeInSlot(
        context.mediaWidth,
        context.mediaHeight,
        context.slotAspect,
        state.scale,
      );
      return clampTransform({ ...state, offsetX: nextX, offsetY: nextY }, draw);
    }

    case 'scale': {
      const targetScale = Number.isFinite(action.scale) ? action.scale : MIN_SCALE;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
      const draw = drawSizeInSlot(
        context.mediaWidth,
        context.mediaHeight,
        context.slotAspect,
        nextScale,
      );
      return clampTransform({ ...state, scale: nextScale }, draw);
    }

    case 'rotate': {
      const delta = Number.isFinite(action.deltaRadians) ? action.deltaRadians : 0;
      const current = Number.isFinite(state.rotation) ? state.rotation : 0;
      const twoPi = 2 * Math.PI;
      let nextRotation = (current + delta) % twoPi;
      if (nextRotation < 0) {
        nextRotation += twoPi;
      }
      if (nextRotation >= twoPi || Object.is(nextRotation, -0)) {
        nextRotation = 0;
      }
      const draw = drawSizeInSlot(
        context.mediaWidth,
        context.mediaHeight,
        context.slotAspect,
        state.scale,
      );
      return clampTransform({ ...state, rotation: nextRotation }, draw);
    }

    case 'flip': {
      const draw = drawSizeInSlot(
        context.mediaWidth,
        context.mediaHeight,
        context.slotAspect,
        state.scale,
      );
      return clampTransform({ ...state, flipX: !state.flipX }, draw);
    }
  }
}
