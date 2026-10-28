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
