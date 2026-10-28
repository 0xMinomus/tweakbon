import type { TemplateIndex, TemplateManifest } from '../../types/template';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const EPSILON = 1e-4;

export function parseManifest(input: unknown): ParseResult<TemplateManifest> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Manifest must be an object' };
  }

  const rec = input as Record<string, unknown>;

  if (typeof rec.id !== 'string' || rec.id.trim() === '') {
    return { ok: false, error: 'Field "id" must be a non-empty string' };
  }

  if (typeof rec.name !== 'string' || rec.name.trim() === '') {
    return { ok: false, error: 'Field "name" must be a non-empty string' };
  }

  if (rec.kind !== 'image' && rec.kind !== 'video') {
    return { ok: false, error: 'Field "kind" must be "image" or "video"' };
  }

  if (typeof rec.src !== 'string' || !rec.src.startsWith('/')) {
    return { ok: false, error: 'Field "src" must be a string starting with "/"' };
  }

  if (
    typeof rec.naturalWidth !== 'number' ||
    !Number.isInteger(rec.naturalWidth) ||
    rec.naturalWidth <= 0
  ) {
    return { ok: false, error: 'Field "naturalWidth" must be a positive integer' };
  }

  if (
    typeof rec.naturalHeight !== 'number' ||
    !Number.isInteger(rec.naturalHeight) ||
    rec.naturalHeight <= 0
  ) {
    return { ok: false, error: 'Field "naturalHeight" must be a positive integer' };
  }

  if (typeof rec.slot !== 'object' || rec.slot === null || Array.isArray(rec.slot)) {
    return { ok: false, error: 'Field "slot" must be an object' };
  }

  const slotRec = rec.slot as Record<string, unknown>;

  if (typeof slotRec.x !== 'number' || !Number.isFinite(slotRec.x)) {
    return { ok: false, error: 'Field "slot.x" must be a finite number' };
  }
  if (typeof slotRec.y !== 'number' || !Number.isFinite(slotRec.y)) {
    return { ok: false, error: 'Field "slot.y" must be a finite number' };
  }
  if (typeof slotRec.width !== 'number' || !Number.isFinite(slotRec.width) || slotRec.width <= 0) {
    return { ok: false, error: 'Field "slot.width" must be a positive number' };
  }
  if (
    typeof slotRec.height !== 'number' ||
    !Number.isFinite(slotRec.height) ||
    slotRec.height <= 0
  ) {
    return { ok: false, error: 'Field "slot.height" must be a positive number' };
  }

  if (slotRec.x < -EPSILON || slotRec.x > 1 + EPSILON) {
    return { ok: false, error: 'Field "slot.x" must be within 0..1' };
  }
  if (slotRec.y < -EPSILON || slotRec.y > 1 + EPSILON) {
    return { ok: false, error: 'Field "slot.y" must be within 0..1' };
  }
  if (slotRec.x + slotRec.width > 1 + EPSILON) {
    return { ok: false, error: 'Field "slot.x + slot.width" must not exceed 1' };
  }
  if (slotRec.y + slotRec.height > 1 + EPSILON) {
    return { ok: false, error: 'Field "slot.y + slot.height" must not exceed 1' };
  }

  const manifest: TemplateManifest = {
    id: rec.id,
    name: rec.name,
    kind: rec.kind,
    src: rec.src,
    naturalWidth: rec.naturalWidth,
    naturalHeight: rec.naturalHeight,
    slot: {
      x: slotRec.x,
      y: slotRec.y,
      width: slotRec.width,
      height: slotRec.height,
    },
  };

  if (rec.slotPolygon !== undefined) {
    if (!Array.isArray(rec.slotPolygon) || rec.slotPolygon.length < 3) {
      return { ok: false, error: 'Field "slotPolygon" must be an array of at least 3 points' };
    }
    const polygon = [];
    for (let i = 0; i < rec.slotPolygon.length; i++) {
      const pt = rec.slotPolygon[i];
      if (typeof pt !== 'object' || pt === null || Array.isArray(pt)) {
        return { ok: false, error: `Field "slotPolygon[${i}]" must be a point object` };
      }
      const ptRec = pt as Record<string, unknown>;
      if (
        typeof ptRec.x !== 'number' ||
        !Number.isFinite(ptRec.x) ||
        ptRec.x < -EPSILON ||
        ptRec.x > 1 + EPSILON
      ) {
        return { ok: false, error: `Field "slotPolygon[${i}].x" must be within 0..1` };
      }
      if (
        typeof ptRec.y !== 'number' ||
        !Number.isFinite(ptRec.y) ||
        ptRec.y < -EPSILON ||
        ptRec.y > 1 + EPSILON
      ) {
        return { ok: false, error: `Field "slotPolygon[${i}].y" must be within 0..1` };
      }
      polygon.push({ x: ptRec.x, y: ptRec.y });
    }
    manifest.slotPolygon = polygon;
  }

  if (rec.defaultFit !== undefined) {
    if (rec.defaultFit !== 'cover' && rec.defaultFit !== 'contain') {
      return { ok: false, error: 'Field "defaultFit" must be "cover" or "contain"' };
    }
    manifest.defaultFit = rec.defaultFit;
  }

  return { ok: true, value: manifest };
}

export function parseTemplateIndex(input: unknown): ParseResult<TemplateIndex> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Template index must be an object' };
  }

  const rec = input as Record<string, unknown>;
  if (!Array.isArray(rec.templates)) {
    return { ok: false, error: 'Field "templates" must be an array' };
  }

  const templates: TemplateManifest[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rec.templates.length; i++) {
    const parsed = parseManifest(rec.templates[i]);
    if (!parsed.ok) {
      return { ok: false, error: `Template at index ${i} is invalid: ${parsed.error}` };
    }
    if (seenIds.has(parsed.value.id)) {
      return { ok: false, error: `Duplicate template id: "${parsed.value.id}"` };
    }
    seenIds.add(parsed.value.id);
    templates.push(parsed.value);
  }

  return { ok: true, value: { templates } };
}

export async function loadTemplateIndex(
  url = '/templates/index.json',
): Promise<ParseResult<TemplateIndex>> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, error: `Failed to load template index: HTTP ${res.status}` };
    }
    const json: unknown = await res.json();
    return parseTemplateIndex(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to fetch template index: ${message}` };
  }
}
