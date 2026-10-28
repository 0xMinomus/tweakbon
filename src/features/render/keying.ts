import type { ChromaKeySettings, Rgb } from '../../types/editor';
import { buildChromaKeyLut, lookupChromaAlpha, despill } from '../editor/chroma';

const lutCache = new WeakMap<ChromaKeySettings, Uint8ClampedArray>();

function getLut(settings: ChromaKeySettings): Uint8ClampedArray {
  let lut = lutCache.get(settings);
  if (!lut) {
    lut = buildChromaKeyLut(settings);
    lutCache.set(settings, lut);
  }
  return lut;
}

const MAX_VIDEO_SIDE = 1280;
let workCanvas: HTMLCanvasElement | null = null;
let workCtx: CanvasRenderingContext2D | null = null;

function getWorkCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  if (!workCanvas) {
    workCanvas = document.createElement('canvas');
  }
  if (workCanvas.width !== width || workCanvas.height !== height) {
    workCanvas.width = width;
    workCanvas.height = height;
  }
  if (!workCtx) {
    workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!workCtx) return null;
  return [workCanvas, workCtx];
}

export function drawKeyedVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  settings: ChromaKeySettings,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  if (typeof video.readyState === 'number' && video.readyState < 2) return;

  if (!settings.enabled) {
    ctx.drawImage(video, dx, dy, dw, dh);
    return;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const maxDim = Math.max(vw, vh);
  const scale = maxDim > MAX_VIDEO_SIDE ? MAX_VIDEO_SIDE / maxDim : 1;
  const workW = Math.max(1, Math.round(vw * scale));
  const workH = Math.max(1, Math.round(vh * scale));

  const target = getWorkCanvas(workW, workH);
  if (!target) return;
  const [canvas, cCtx] = target;

  cCtx.drawImage(video, 0, 0, workW, workH);

  const imgData = cCtx.getImageData(0, 0, workW, workH);
  const data = imgData.data;
  const lut = getLut(settings);
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = lookupChromaAlpha(lut, r, g, b);

    if (a === 0) {
      data[i + 3] = 0;
    } else if (a < 255) {
      data[i + 3] = Math.round((data[i + 3] * a) / 255);
      const [dr, dg, db] = despill(r, g, b, settings);
      data[i] = dr;
      data[i + 1] = dg;
      data[i + 2] = db;
    }
  }

  cCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(canvas, dx, dy, dw, dh);
}

const MAX_CORNER_SIDE = 320;
let cornerCanvas: HTMLCanvasElement | null = null;
let cornerCtx: CanvasRenderingContext2D | null = null;

function getCornerCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  if (!cornerCanvas) {
    cornerCanvas = document.createElement('canvas');
  }
  if (cornerCanvas.width !== width || cornerCanvas.height !== height) {
    cornerCanvas.width = width;
    cornerCanvas.height = height;
  }
  if (!cornerCtx) {
    cornerCtx = cornerCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!cornerCtx) return null;
  return [cornerCanvas, cornerCtx];
}

export function averageCornerColor(video: HTMLVideoElement): Rgb {
  if (typeof video.readyState === 'number' && video.readyState < 2) {
    return { r: 0, g: 0, b: 0 };
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    return { r: 0, g: 0, b: 0 };
  }

  const maxDim = Math.max(vw, vh);
  const scale = maxDim > MAX_CORNER_SIDE ? MAX_CORNER_SIDE / maxDim : 1;
  const w = Math.max(5, Math.round(vw * scale));
  const h = Math.max(5, Math.round(vh * scale));

  const target = getCornerCanvas(w, h);
  if (!target) return { r: 0, g: 0, b: 0 };
  const [, cCtx] = target;

  cCtx.drawImage(video, 0, 0, w, h);

  const bw = Math.min(5, w);
  const bh = Math.min(5, h);

  const corners = [
    { x: 0, y: 0 },
    { x: w - bw, y: 0 },
    { x: 0, y: h - bh },
    { x: w - bw, y: h - bh },
  ];

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (const c of corners) {
    const imgData = cCtx.getImageData(c.x, c.y, bw, bh);
    const d = imgData.data;
    const len = d.length;
    for (let i = 0; i < len; i += 4) {
      sumR += d[i];
      sumG += d[i + 1];
      sumB += d[i + 2];
      count++;
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0 };

  const clamp255 = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  return {
    r: clamp255(sumR / count),
    g: clamp255(sumG / count),
    b: clamp255(sumB / count),
  };
}
