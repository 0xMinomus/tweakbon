import type { PhotoMedia } from '../../types/media';
import type { CutoutMask } from '../../types/editor';

const maskCanvasCache = new WeakMap<CutoutMask, HTMLCanvasElement>();
const bakedMediaCache = new WeakMap<CutoutMask, HTMLCanvasElement>();

function getMaskCanvas(mask: CutoutMask): HTMLCanvasElement {
  const cached = maskCanvasCache.get(mask);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = mask.width;
  canvas.height = mask.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal membuat 2D context untuk masker.');
  }

  const imgData = ctx.createImageData(mask.width, mask.height);
  const data = imgData.data;
  const alpha = mask.alpha;
  const total = mask.width * mask.height;

  for (let i = 0; i < total; i++) {
    const idx = i << 2;
    data[idx] = 255;
    data[idx + 1] = 255;
    data[idx + 2] = 255;
    data[idx + 3] = alpha[i];
  }

  ctx.putImageData(imgData, 0, 0);
  maskCanvasCache.set(mask, canvas);
  return canvas;
}

export function bakeMaskedMedia(media: PhotoMedia, mask: CutoutMask): HTMLCanvasElement {
  const cached = bakedMediaCache.get(mask);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = media.width;
  canvas.height = media.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal membuat 2D context untuk foto.');
  }

  ctx.drawImage(media.source, 0, 0, media.width, media.height);

  const maskCanvas = getMaskCanvas(mask);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(maskCanvas, 0, 0, media.width, media.height);
  ctx.globalCompositeOperation = 'source-over';

  bakedMediaCache.set(mask, canvas);
  return canvas;
}
