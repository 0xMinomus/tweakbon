import type { ChromaKeySettings } from '../../types/editor';

export const DEFAULT_CHROMA_KEY: ChromaKeySettings = {
  enabled: false,
  color: { r: 0, g: 177, b: 64 },
  similarity: 0.3,
  smoothness: 0.12,
  spill: 0.35,
};

export const CHROMA_LUT_SIZE = 32;

const SQRT_3 = Math.sqrt(3);

export function chromaKeyAlpha(
  r: number,
  g: number,
  b: number,
  settings: ChromaKeySettings,
): number {
  const cr = Number.isFinite(r) ? Math.min(255, Math.max(0, r)) : 0;
  const cg = Number.isFinite(g) ? Math.min(255, Math.max(0, g)) : 0;
  const cb = Number.isFinite(b) ? Math.min(255, Math.max(0, b)) : 0;

  const kr = settings.color.r;
  const kg = settings.color.g;
  const kb = settings.color.b;

  const dr = cr - kr;
  const dg = cg - kg;
  const db = cb - kb;
  const d = Math.sqrt(dr * dr + dg * dg + db * db) / (255 * SQRT_3);

  const similarity = Number.isFinite(settings.similarity) ? settings.similarity : 0;
  const smoothness = Number.isFinite(settings.smoothness) ? settings.smoothness : 0;

  const inner = Math.min(1, Math.max(0, similarity));
  const outer = Math.min(1, Math.max(inner, similarity + smoothness * 0.5));

  if (d <= inner) return 0;
  if (d >= outer) return 255;

  return Math.round((255 * (d - inner)) / (outer - inner));
}

export function buildChromaKeyLut(settings: ChromaKeySettings): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(32768);
  for (let ri = 0; ri < 32; ri++) {
    const r = (ri * 255) / 31;
    const rOffset = ri << 10;
    for (let gi = 0; gi < 32; gi++) {
      const g = (gi * 255) / 31;
      const rgOffset = rOffset | (gi << 5);
      for (let bi = 0; bi < 32; bi++) {
        const b = (bi * 255) / 31;
        lut[rgOffset | bi] = chromaKeyAlpha(r, g, b, settings);
      }
    }
  }
  return lut;
}

export function lookupChromaAlpha(
  lut: Uint8ClampedArray,
  r: number,
  g: number,
  b: number,
): number {
  if (lut.length !== 32768) {
    return 255;
  }

  const cr = Number.isFinite(r) ? Math.min(255, Math.max(0, r)) : 0;
  const cg = Number.isFinite(g) ? Math.min(255, Math.max(0, g)) : 0;
  const cb = Number.isFinite(b) ? Math.min(255, Math.max(0, b)) : 0;

  const u = (cr * 31) / 255;
  const v = (cg * 31) / 255;
  const w = (cb * 31) / 255;

  const x0 = u | 0;
  const x1 = x0 < 31 ? x0 + 1 : 31;
  const y0 = v | 0;
  const y1 = y0 < 31 ? y0 + 1 : 31;
  const z0 = w | 0;
  const z1 = z0 < 31 ? z0 + 1 : 31;

  const fx = u - x0;
  const fy = v - y0;
  const fz = w - z0;

  if (fx === 0 && fy === 0 && fz === 0) {
    return lut[(x0 << 10) | (y0 << 5) | z0] ?? 255;
  }

  const y0_5 = y0 << 5;
  const y1_5 = y1 << 5;
  const x0_10 = x0 << 10;
  const x1_10 = x1 << 10;

  const c000 = lut[x0_10 | y0_5 | z0] ?? 255;
  const c001 = lut[x0_10 | y0_5 | z1] ?? 255;
  const c010 = lut[x0_10 | y1_5 | z0] ?? 255;
  const c011 = lut[x0_10 | y1_5 | z1] ?? 255;
  const c100 = lut[x1_10 | y0_5 | z0] ?? 255;
  const c101 = lut[x1_10 | y0_5 | z1] ?? 255;
  const c110 = lut[x1_10 | y1_5 | z0] ?? 255;
  const c111 = lut[x1_10 | y1_5 | z1] ?? 255;

  const c00 = c000 + (c001 - c000) * fz;
  const c01 = c010 + (c011 - c010) * fz;
  const c10 = c100 + (c101 - c100) * fz;
  const c11 = c110 + (c111 - c110) * fz;

  const c0 = c00 + (c01 - c00) * fy;
  const c1 = c10 + (c11 - c10) * fy;

  return Math.round(c0 + (c1 - c0) * fx);
}

export function despill(
  r: number,
  g: number,
  b: number,
  settings: ChromaKeySettings,
): [number, number, number] {
  if (settings.spill <= 0) {
    return [Math.round(r), Math.round(g), Math.round(b)];
  }

  const cr = Number.isFinite(r) ? Math.min(255, Math.max(0, r)) : 0;
  const cg = Number.isFinite(g) ? Math.min(255, Math.max(0, g)) : 0;
  const cb = Number.isFinite(b) ? Math.min(255, Math.max(0, b)) : 0;

  const kr = settings.color.r;
  const kg = settings.color.g;
  const kb = settings.color.b;

  const dr = cr - kr;
  const dg = cg - kg;
  const db = cb - kb;
  const d = Math.sqrt(dr * dr + dg * dg + db * db) / (255 * SQRT_3);

  const similarity = Number.isFinite(settings.similarity) ? settings.similarity : 0;
  const smoothness = Number.isFinite(settings.smoothness) ? settings.smoothness : 0;
  const inner = Math.min(1, Math.max(0, similarity));
  const outer = Math.min(1, Math.max(inner, similarity + smoothness * 0.5));

  const strength = Math.min(1, Math.max(0, 1 - d / Math.max(outer, 1e-6)));
  if (strength <= 0) {
    return [Math.round(cr), Math.round(cg), Math.round(cb)];
  }

  const spillAmount = Math.min(1, Math.max(0, settings.spill)) * strength;

  let resR = cr;
  let resG = cg;
  let resB = cb;

  if (kg >= kr && kg >= kb) {
    const avgOther = (cr + cb) / 2;
    if (cg > avgOther) {
      resG = cg - (cg - avgOther) * spillAmount;
    }
  } else if (kr >= kg && kr >= kb) {
    const avgOther = (cg + cb) / 2;
    if (cr > avgOther) {
      resR = cr - (cr - avgOther) * spillAmount;
    }
  } else {
    const avgOther = (cr + cg) / 2;
    if (cb > avgOther) {
      resB = cb - (cb - avgOther) * spillAmount;
    }
  }

  return [
    Math.round(Math.min(255, Math.max(0, resR))),
    Math.round(Math.min(255, Math.max(0, resG))),
    Math.round(Math.min(255, Math.max(0, resB))),
  ];
}
