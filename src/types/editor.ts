/**
 * Editor contract. Owned by the orchestrator.
 *
 * Units: every offset and size in this file is expressed in **slot space**,
 * where 1 equals the slot's width horizontally and the slot's height
 * vertically. Nothing here knows about pixels, templates, or the DOM.
 *
 * `scale === 1` means the media covers the slot exactly. The transform is
 * always relative to the slot, never to the template, so a template can move
 * its hole without invalidating a saved adjustment.
 */

export interface TransformState {
  /** Horizontal offset in slot units. 0 = centered. */
  offsetX: number;
  /** Vertical offset in slot units. 0 = centered. */
  offsetY: number;
  /** 1 = media covers the slot exactly. Clamped to MIN_SCALE..MAX_SCALE. */
  scale: number;
  /** Clockwise rotation in radians. */
  rotation: number;
  flipX: boolean;
}

/** Media draw size in slot units, before rotation. */
export interface DrawSize {
  width: number;
  height: number;
}

/** An sRGB colour, channels 0..255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Chroma key settings. Applied only to video media; a photo never carries one.
 * All three amounts are 0..1 so the UI can bind them to plain sliders.
 */
export interface ChromaKeySettings {
  /** false draws the video untouched. */
  enabled: boolean;
  /** Colour treated as background. */
  color: Rgb;
  /** Core match width: higher removes more of the surrounding colour. */
  similarity: number;
  /** Edge softness: higher feathers the boundary. */
  smoothness: number;
  /** Colour de-spill on kept pixels: higher pulls the key colour out of edges. */
  spill: number;
}

/** Playback window of the user's video, in seconds. `start < end`. */
export interface VideoTrim {
  start: number;
  end: number;
}

/**
 * Photo background removal mask. Big and non-serializable: it lives in a ref,
 * never in React state. `alpha` is one byte per source pixel, row-major,
 * `width * height` long; 0 = removed, 255 = kept.
 */
export interface CutoutMask {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
}

/** A point in source-media pixel coordinates. */
export interface MaskPoint {
  x: number;
  y: number;
}
