import type { SlotRect } from './template';

/**
 * Media contract. Owned by the orchestrator.
 *
 * Two inputs, deliberately asymmetric:
 *  - the template (left pane) is a still image OR a video and is the top layer.
 *    It may arrive with its own alpha hole, or fully opaque; when opaque the
 *    user carves the hole out of the template itself with chroma key (video
 *    template) or background removal (photo template).
 *  - the user media (right pane) is a still photo OR a video without alpha and
 *    is never keyed or masked; it is simply drawn behind the template.
 *
 * Media objects are large and non-serializable. They never enter React state;
 * they live in refs or an owner object. Every source carries its own release().
 */

/** The user's still photo. */
export interface PhotoMedia {
  kind: 'photo';
  source: ImageBitmap;
  width: number;
  height: number;
  /** Idempotent. Called on replace and on unmount. */
  release: () => void;
}

/** The user's video. Always opaque; chroma key decides what is removed. */
export interface VideoMedia {
  kind: 'video';
  source: HTMLVideoElement;
  width: number;
  height: number;
  /** Clip length in seconds; finite and > 0. */
  duration: number;
  /** Idempotent. Called on replace and on unmount. */
  release: () => void;
}

/** Whatever the user dropped in the media pane. */
export type UserMedia = PhotoMedia | VideoMedia;

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
