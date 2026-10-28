import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadTemplateIndex,
  parseManifest,
  parseTemplateIndex,
} from './manifest';

const validManifest = {
  id: 'merdeka',
  name: 'Merdeka Frame',
  kind: 'image' as const,
  src: '/templates/merdeka.svg',
  naturalWidth: 1080,
  naturalHeight: 1350,
  slot: {
    x: 0.1,
    y: 0.2,
    width: 0.8,
    height: 0.6,
  },
};

describe('parseManifest', () => {
  it('parses valid manifest and strips unknown keys', () => {
    const input = {
      ...validManifest,
      extraField: 'should-be-stripped',
      slot: {
        ...validManifest.slot,
        extraSlotField: 123,
      },
    };

    const res = parseManifest(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual(validManifest);
      expect((res.value as unknown as Record<string, unknown>).extraField).toBeUndefined();
      expect(
        (res.value.slot as unknown as Record<string, unknown>).extraSlotField,
      ).toBeUndefined();
    }
  });

  it('accepts valid slotPolygon with 3 or more points', () => {
    const input = {
      ...validManifest,
      slotPolygon: [
        { x: 0.1, y: 0.2 },
        { x: 0.9, y: 0.2 },
        { x: 0.5, y: 0.8 },
      ],
    };

    const res = parseManifest(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.slotPolygon).toHaveLength(3);
    }
  });

  it('accepts defaultFit cover and contain', () => {
    const coverRes = parseManifest({ ...validManifest, defaultFit: 'cover' });
    expect(coverRes.ok).toBe(true);
    if (coverRes.ok) expect(coverRes.value.defaultFit).toBe('cover');

    const containRes = parseManifest({ ...validManifest, defaultFit: 'contain' });
    expect(containRes.ok).toBe(true);
    if (containRes.ok) expect(containRes.value.defaultFit).toBe('contain');
  });

  // Rejection classes
  it('rejects non-object input', () => {
    expect(parseManifest(null).ok).toBe(false);
    expect(parseManifest('str').ok).toBe(false);
    expect(parseManifest([]).ok).toBe(false);
  });

  it('rejects missing or empty id', () => {
    expect(parseManifest({ ...validManifest, id: '' }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, id: '   ' }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, id: 123 }).ok).toBe(false);
  });

  it('rejects missing or empty name', () => {
    expect(parseManifest({ ...validManifest, name: '' }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, name: '   ' }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, name: undefined }).ok).toBe(false);
  });

  it('rejects invalid kind', () => {
    expect(parseManifest({ ...validManifest, kind: 'audio' }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, kind: '' }).ok).toBe(false);
  });

  it('rejects src not starting with /', () => {
    expect(parseManifest({ ...validManifest, src: 'templates/merdeka.svg' }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, src: 123 }).ok).toBe(false);
  });

  it('rejects non-positive integer naturalWidth', () => {
    expect(parseManifest({ ...validManifest, naturalWidth: 0 }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, naturalWidth: -100 }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, naturalWidth: 100.5 }).ok).toBe(false);
  });

  it('rejects non-positive integer naturalHeight', () => {
    expect(parseManifest({ ...validManifest, naturalHeight: 0 }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, naturalHeight: -10 }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, naturalHeight: 50.2 }).ok).toBe(false);
  });

  it('rejects invalid slot object', () => {
    expect(parseManifest({ ...validManifest, slot: null }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, slot: [] }).ok).toBe(false);
    expect(parseManifest({ ...validManifest, slot: 'box' }).ok).toBe(false);
  });

  it('rejects non-finite slot numbers', () => {
    expect(
      parseManifest({
        ...validManifest,
        slot: { ...validManifest.slot, x: Number.NaN },
      }).ok,
    ).toBe(false);
    expect(
      parseManifest({
        ...validManifest,
        slot: { ...validManifest.slot, width: Number.POSITIVE_INFINITY },
      }).ok,
    ).toBe(false);
  });

  it('rejects non-positive slot width or height', () => {
    expect(
      parseManifest({
        ...validManifest,
        slot: { ...validManifest.slot, width: 0 },
      }).ok,
    ).toBe(false);
    expect(
      parseManifest({
        ...validManifest,
        slot: { ...validManifest.slot, height: -0.5 },
      }).ok,
    ).toBe(false);
  });

  it('rejects slot out of 0..1 bounds', () => {
    expect(
      parseManifest({
        ...validManifest,
        slot: { ...validManifest.slot, x: -0.1 },
      }).ok,
    ).toBe(false);
    expect(
      parseManifest({
        ...validManifest,
        slot: { ...validManifest.slot, y: 1.2 },
      }).ok,
    ).toBe(false);
    expect(
      parseManifest({
        ...validManifest,
        slot: { x: 0.5, y: 0.5, width: 0.6, height: 0.2 },
      }).ok,
    ).toBe(false);
    expect(
      parseManifest({
        ...validManifest,
        slot: { x: 0.2, y: 0.6, width: 0.5, height: 0.5 },
      }).ok,
    ).toBe(false);
  });

  it('rejects invalid slotPolygon', () => {
    expect(
      parseManifest({
        ...validManifest,
        slotPolygon: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }).ok,
    ).toBe(false);

    expect(
      parseManifest({
        ...validManifest,
        slotPolygon: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1.5, y: 1 },
        ],
      }).ok,
    ).toBe(false);
  });

  it('rejects invalid defaultFit', () => {
    expect(parseManifest({ ...validManifest, defaultFit: 'stretch' }).ok).toBe(false);
  });
});

describe('parseTemplateIndex', () => {
  it('parses valid template index', () => {
    const res = parseTemplateIndex({
      templates: [
        validManifest,
        { ...validManifest, id: 'wisuda', name: 'Wisuda Frame' },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.templates).toHaveLength(2);
    }
  });

  it('rejects non-object index', () => {
    expect(parseTemplateIndex(null).ok).toBe(false);
    expect(parseTemplateIndex([]).ok).toBe(false);
  });

  it('rejects missing templates array', () => {
    expect(parseTemplateIndex({}).ok).toBe(false);
    expect(parseTemplateIndex({ templates: 'not-an-array' }).ok).toBe(false);
  });

  it('rejects invalid item in templates', () => {
    const res = parseTemplateIndex({
      templates: [validManifest, { id: 'bad' }],
    });
    expect(res.ok).toBe(false);
  });

  it('rejects duplicate template ids', () => {
    const res = parseTemplateIndex({
      templates: [validManifest, { ...validManifest, name: 'Other Name' }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('Duplicate template id: "merdeka"');
    }
  });
});

describe('loadTemplateIndex', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and returns parsed template index', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ templates: [validManifest] }),
    });

    const res = await loadTemplateIndex('/templates/index.json');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.templates).toHaveLength(1);
    }
  });

  it('returns ok: false on HTTP error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const res = await loadTemplateIndex('/templates/index.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('HTTP 404');
    }
  });

  it('returns ok: false on malformed JSON payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Unexpected token < in JSON at position 0');
      },
    });

    const res = await loadTemplateIndex('/templates/index.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('Unexpected token');
    }
  });

  it('returns ok: false on fetch network exception', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await loadTemplateIndex('/templates/index.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('Network error');
    }
  });
});
