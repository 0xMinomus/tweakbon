/**
 * Template contract. Owned by the orchestrator: do not change field names or
 * units without updating `slot-detect.ts`, `compositor.ts`, and every manifest
 * under `public/templates/`.
 */

export type TemplateKind = 'image' | 'video';

/** A point in template-normalized space (0..1 of the template's natural size). */
export interface Point {
  x: number;
  y: number;
}

/** A rectangle in template-normalized space (0..1 of the template's natural size). */
export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateManifest {
  /** Stable slug. Also the asset filename stem. */
  id: string;
  /** Human label shown in the picker. Indonesian, short. */
  name: string;
  kind: TemplateKind;
  /** Path under `public/`, e.g. `/templates/merdeka.svg`. */
  src: string;
  /** Intrinsic pixel size of the template asset. */
  naturalWidth: number;
  naturalHeight: number;
  /** The transparent region the user's media shows through. */
  slot: SlotRect;
  /** Optional non-rectangular hole. Points normalized, 3 or more, in order. */
  slotPolygon?: Point[];
  /** Author hint for the initial fit. Defaults to 'cover'. */
  defaultFit?: 'cover' | 'contain';
}
