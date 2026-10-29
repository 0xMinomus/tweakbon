import type { TemplateImage } from '../../types/media';
import type { CutoutMask } from '../../types/editor';

const maskCanvasCache = new WeakMap<CutoutMask, HTMLCanvasElement>();
const bakedCache = new WeakMap<CutoutMask, { source: ImageBitmap; canvas: HTMLCanvasElement }>();

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

export function bakeMaskedTemplate(template: TemplateImage, mask: CutoutMask): HTMLCanvasElement {
  const cached = bakedCache.get(mask);
  if (cached && cached.source === template.source) return cached.canvas;

  const canvas = document.createElement('canvas');
  canvas.width = template.width;
  canvas.height = template.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal membuat 2D context untuk template.');
  }

  ctx.drawImage(template.source, 0, 0, template.width, template.height);

  const maskCanvas = getMaskCanvas(mask);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(maskCanvas, 0, 0, template.width, template.height);
  ctx.globalCompositeOperation = 'source-over';

  bakedCache.set(mask, { source: template.source, canvas });
  return canvas;
}
