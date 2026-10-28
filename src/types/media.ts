import type { SlotRect } from './template';

/**
 * Media contract. Owned by the orchestrator.
 *
 * Two inputs, deliberately asymmetric:
 *  - the template (left pane) is a still image OR a video, and carries the
 *    transparent slot the user's photo shows through;
 *  - the user photo (right pane) is always a still image.
 *
 * Media objects are large and non-serializable. They never enter React state;
 * they live in refs or an owner object. Every source carries its own release().
 */

/** The user's photo. Always a still image. */
export interface PhotoMedia {
  source: ImageBitmap;
  width: number;
  height: number;
  /** Idempotent. Called on replace and on unmount. */
  release: () => void;
}

/** A still template frame, ready for drawImage. */
export interface TemplateImage {
  kind: 'image';
  source: ImageBitmap;
  width: number;
  height: number;
  release: () => void;
}

/**
 * A video template. `slot` is sampled once from an early frame and assumed
 * constant for the whole clip; see `docs/architecture.md`.
 */
export interface TemplateVideo {
  kind: 'video';
  source: HTMLVideoElement;
  width: number;
  height: number;
  release: () => void;
}

export type TemplateSource = TemplateImage | TemplateVideo;

/** The decoded template the compositor draws on top, plus its own slot. */
export interface LoadedTemplate {
  template: TemplateSource;
  slot: SlotRect;
  naturalWidth: number;
  naturalHeight: number;
}
