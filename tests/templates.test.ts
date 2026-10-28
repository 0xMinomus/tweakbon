import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const publicDir = resolve(projectRoot, 'public');
const indexPath = resolve(publicDir, 'templates', 'index.json');
const indexRelPath = 'public/templates/index.json';

const EPSILON = 1e-4;

describe('Template catalog verification', () => {
  it('has public/templates/index.json catalog file', () => {
    expect(existsSync(indexPath), `${indexRelPath}: file not found`).toBe(true);
  });

  if (!existsSync(indexPath)) {
    return;
  }

  const rawJson = readFileSync(indexPath, 'utf-8');
  let parsed: { templates?: unknown[] };

  it('contains valid JSON in public/templates/index.json', () => {
    expect(() => {
      parsed = JSON.parse(rawJson);
    }, `${indexRelPath}: invalid JSON`).not.toThrow();
  });

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return;
  }

  it('has an object with a templates array', () => {
    expect(parsed && typeof parsed === 'object' && Array.isArray(parsed.templates)).toBe(true);
  });

  const templates = Array.isArray(parsed?.templates) ? parsed.templates : [];

  it('has unique template ids', () => {
    const seenIds = new Set<string>();
    for (const t of templates) {
      if (t && typeof t === 'object' && 'id' in t && typeof t.id === 'string') {
        expect(seenIds.has(t.id), `duplicate template id "${t.id}"`).toBe(false);
        seenIds.add(t.id);
      }
    }
  });

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i] as Record<string, unknown>;
    const tId = typeof t?.id === 'string' ? t.id : `template_${i}`;

    describe(`Template: ${tId}`, () => {
      it('has valid manifest field types', () => {
        expect(typeof t.id, 'id must be non-empty string').toBe('string');
        expect((t.id as string).trim().length > 0, 'id cannot be empty').toBe(true);

        expect(typeof t.name, 'name must be non-empty string').toBe('string');
        expect((t.name as string).trim().length > 0, 'name cannot be empty').toBe(true);

        expect(t.kind === 'image' || t.kind === 'video', 'kind must be "image" or "video"').toBe(true);

        expect(typeof t.src, 'src must be a string').toBe('string');
        expect((t.src as string).startsWith('/'), 'src must start with "/"').toBe(true);

        expect(Number.isInteger(t.naturalWidth), 'naturalWidth must be integer').toBe(true);
        expect((t.naturalWidth as number) > 0, 'naturalWidth must be positive').toBe(true);

        expect(Number.isInteger(t.naturalHeight), 'naturalHeight must be integer').toBe(true);
        expect((t.naturalHeight as number) > 0, 'naturalHeight must be positive').toBe(true);
      });

      it('has valid slot coordinates within 0..1', () => {
        expect(t.slot && typeof t.slot === 'object', 'slot must be object').toBe(true);
        const slot = t.slot as Record<string, unknown>;

        expect(typeof slot.x === 'number' && Number.isFinite(slot.x), 'slot.x must be finite').toBe(true);
        expect(typeof slot.y === 'number' && Number.isFinite(slot.y), 'slot.y must be finite').toBe(true);
        expect(typeof slot.width === 'number' && Number.isFinite(slot.width), 'slot.width must be finite').toBe(true);
        expect(typeof slot.height === 'number' && Number.isFinite(slot.height), 'slot.height must be finite').toBe(true);

        const x = slot.x as number;
        const y = slot.y as number;
        const width = slot.width as number;
        const height = slot.height as number;

        expect(width > 0, 'slot.width must be positive').toBe(true);
        expect(height > 0, 'slot.height must be positive').toBe(true);

        expect(x >= -EPSILON, 'slot.x must be >= 0').toBe(true);
        expect(y >= -EPSILON, 'slot.y must be >= 0').toBe(true);
        expect(x + width <= 1 + EPSILON, 'slot.x + slot.width must be <= 1').toBe(true);
        expect(y + height <= 1 + EPSILON, 'slot.y + slot.height must be <= 1').toBe(true);
      });

      if (t.slotPolygon !== undefined) {
        it('has valid slotPolygon points within 0..1 if defined', () => {
          expect(Array.isArray(t.slotPolygon), 'slotPolygon must be an array').toBe(true);
          const poly = t.slotPolygon as Array<Record<string, unknown>>;
          expect(poly.length >= 3, 'slotPolygon must have at least 3 points').toBe(true);

          for (let p = 0; p < poly.length; p++) {
            const pt = poly[p];
            expect(typeof pt.x === 'number' && Number.isFinite(pt.x), `point ${p}.x must be finite`).toBe(true);
            expect(typeof pt.y === 'number' && Number.isFinite(pt.y), `point ${p}.y must be finite`).toBe(true);
            expect((pt.x as number) >= -EPSILON && (pt.x as number) <= 1 + EPSILON, `point ${p}.x in 0..1`).toBe(true);
            expect((pt.y as number) >= -EPSILON && (pt.y as number) <= 1 + EPSILON, `point ${p}.y in 0..1`).toBe(true);
          }
        });
      }

      if (t.defaultFit !== undefined) {
        it('has valid defaultFit option if defined', () => {
          expect(t.defaultFit === 'cover' || t.defaultFit === 'contain', 'defaultFit must be "cover" or "contain"').toBe(true);
        });
      }

      it('has file stem matching template id', () => {
        if (typeof t.src === 'string' && typeof t.id === 'string') {
          const stem = basename(t.src, extname(t.src));
          expect(stem, `stem "${stem}" matches id "${t.id}"`).toBe(t.id);
        }
      });

      it('has existing asset file under public/', () => {
        if (typeof t.src === 'string') {
          const fileRelPath = t.src.replace(/^\/+/, '');
          const assetFullPath = resolve(publicDir, fileRelPath);
          expect(existsSync(assetFullPath), `public/${fileRelPath} must exist`).toBe(true);

          if (t.src.endsWith('.svg') && existsSync(assetFullPath)) {
            const svgText = readFileSync(assetFullPath, 'utf-8');
            const svgTagMatch = svgText.match(/<svg\b([^>]*)>/i);
            expect(svgTagMatch, 'SVG file must have <svg> tag').not.toBeNull();

            if (svgTagMatch) {
              const attrs = svgTagMatch[1];
              const wMatch = attrs.match(/\bwidth=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
              const hMatch = attrs.match(/\bheight=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);

              expect(Boolean(wMatch && hMatch), 'SVG must declare explicit numeric width and height').toBe(true);
              if (wMatch && hMatch) {
                const svgW = parseFloat(wMatch[1]);
                const svgH = parseFloat(hMatch[1]);
                expect(svgW, `SVG width matches naturalWidth (${t.naturalWidth})`).toBe(t.naturalWidth);
                expect(svgH, `SVG height matches naturalHeight (${t.naturalHeight})`).toBe(t.naturalHeight);
              }
            }
          }
        }
      });
    });
  }
});
