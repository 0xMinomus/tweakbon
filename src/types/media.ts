/**
 * Media contract. Owned by the orchestrator.
 *
 * Media objects are large and non-serializable. They never enter React state;
 * they live in refs or an owner object. Every source carries its own release().
 */

export type MediaKind = 'image' | 'video';

export interface ImageMedia {
  kind: 'image';
  source: ImageBitmap;
  width: number;
  height: number;
  /** Idempotent. Called on replace and on unmount. */
  release: () => void;
}

export interface VideoMedia {
  kind: 'video';
  source: HTMLVideoElement;
  width: number;
  height: number;
  release: () => void;
}

export type MediaSource = ImageMedia | VideoMedia;

/** A decoded template frame, ready for drawImage. */
export interface TemplateImage {
  source: ImageBitmap;
  width: number;
  height: number;
  release: () => void;
}
