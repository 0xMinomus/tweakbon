#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const publicDir = resolve(projectRoot, 'public');
const indexPath = resolve(publicDir, 'templates', 'index.json');
const indexRelPath = 'public/templates/index.json';

const errors = [];

function addError(file, message) {
  errors.push(`${file}: ${message}`);
}

if (!existsSync(indexPath)) {
  console.error(`${indexRelPath}: file not found`);
  process.exit(1);
}

let rawJson;
try {
  rawJson = readFileSync(indexPath, 'utf-8');
} catch (err) {
  console.error(`${indexRelPath}: cannot read file: ${err.message}`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(rawJson);
} catch (err) {
  console.error(`${indexRelPath}: invalid JSON: ${err.message}`);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.templates)) {
  console.error(`${indexRelPath}: root must be an object with a "templates" array`);
  process.exit(1);
}

const EPSILON = 1e-4;
const seenIds = new Set();

for (let i = 0; i < parsed.templates.length; i++) {
  const t = parsed.templates[i];
  const itemPrefix = `templates[${i}]`;

  if (!t || typeof t !== 'object') {
    addError(indexRelPath, `${itemPrefix} must be an object`);
    continue;
  }

  let hasValidId = false;
  if (typeof t.id !== 'string' || t.id.trim() === '') {
    addError(indexRelPath, `${itemPrefix}.id must be a non-empty string`);
  } else if (seenIds.has(t.id)) {
    addError(indexRelPath, `duplicate template id "${t.id}"`);
  } else {
    seenIds.add(t.id);
    hasValidId = true;
  }

  if (typeof t.name !== 'string' || t.name.trim() === '') {
    addError(indexRelPath, `${itemPrefix}.name must be a non-empty string`);
  }

  if (t.kind !== 'image' && t.kind !== 'video') {
    addError(indexRelPath, `${itemPrefix}.kind must be "image" or "video"`);
  }

  let hasValidSrc = false;
  if (typeof t.src !== 'string' || !t.src.startsWith('/')) {
    addError(indexRelPath, `${itemPrefix}.src must be a string starting with "/"`);
  } else {
    hasValidSrc = true;
  }

  if (!Number.isInteger(t.naturalWidth) || t.naturalWidth <= 0) {
    addError(indexRelPath, `${itemPrefix}.naturalWidth must be a positive integer`);
  }
  if (!Number.isInteger(t.naturalHeight) || t.naturalHeight <= 0) {
    addError(indexRelPath, `${itemPrefix}.naturalHeight must be a positive integer`);
  }

  if (!t.slot || typeof t.slot !== 'object') {
    addError(indexRelPath, `${itemPrefix}.slot must be an object`);
  } else {
    const { x, y, width, height } = t.slot;
    if (
      typeof x !== 'number' ||
      !Number.isFinite(x) ||
      typeof y !== 'number' ||
      !Number.isFinite(y) ||
      typeof width !== 'number' ||
      !Number.isFinite(width) ||
      typeof height !== 'number' ||
      !Number.isFinite(height)
    ) {
      addError(indexRelPath, `${itemPrefix}.slot coordinates must be finite numbers`);
    } else {
      if (width <= 0 || height <= 0) {
        addError(indexRelPath, `${itemPrefix}.slot width and height must be positive numbers`);
      }
      if (
        x < -EPSILON ||
        y < -EPSILON ||
        x + width > 1 + EPSILON ||
        y + height > 1 + EPSILON
      ) {
        addError(
          indexRelPath,
          `${itemPrefix}.slot must be inside 0..1 bounds (got x=${x}, y=${y}, width=${width}, height=${height})`,
        );
      }
    }
  }

  if (t.slotPolygon !== undefined) {
    if (!Array.isArray(t.slotPolygon) || t.slotPolygon.length < 3) {
      addError(indexRelPath, `${itemPrefix}.slotPolygon must be an array of at least 3 points`);
    } else {
      for (let p = 0; p < t.slotPolygon.length; p++) {
        const pt = t.slotPolygon[p];
        if (
          !pt ||
          typeof pt !== 'object' ||
          typeof pt.x !== 'number' ||
          !Number.isFinite(pt.x) ||
          typeof pt.y !== 'number' ||
          !Number.isFinite(pt.y) ||
          pt.x < -EPSILON ||
          pt.x > 1 + EPSILON ||
          pt.y < -EPSILON ||
          pt.y > 1 + EPSILON
        ) {
          addError(indexRelPath, `${itemPrefix}.slotPolygon[${p}] must be a point with coordinates in 0..1`);
        }
      }
    }
  }

  if (t.defaultFit !== undefined && t.defaultFit !== 'cover' && t.defaultFit !== 'contain') {
    addError(indexRelPath, `${itemPrefix}.defaultFit must be "cover" or "contain"`);
  }

  if (hasValidId && hasValidSrc) {
    const stem = basename(t.src, extname(t.src));
    if (stem !== t.id) {
      addError(indexRelPath, `template "${t.id}" file stem "${stem}" in src "${t.src}" does not match id "${t.id}"`);
    }
  }

  if (hasValidSrc) {
    const fileRelPath = t.src.replace(/^\/+/, '');
    const assetFullPath = resolve(publicDir, fileRelPath);
    const assetDisplayPath = `public/${fileRelPath}`;

    if (!existsSync(assetFullPath)) {
      addError(assetDisplayPath, 'file does not exist');
    } else if (t.src.endsWith('.svg')) {
      try {
        const svgText = readFileSync(assetFullPath, 'utf-8');
        const svgTagMatch = svgText.match(/<svg\b([^>]*)>/i);
        if (!svgTagMatch) {
          addError(assetDisplayPath, 'missing <svg> root element');
        } else {
          const attrs = svgTagMatch[1];
          const wMatch = attrs.match(/\bwidth=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
          const hMatch = attrs.match(/\bheight=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);

          if (!wMatch || !hMatch) {
            addError(assetDisplayPath, 'SVG must declare explicit numeric width and height attributes');
          } else {
            const svgW = parseFloat(wMatch[1]);
            const svgH = parseFloat(hMatch[1]);
            if (
              Number.isInteger(t.naturalWidth) &&
              Number.isInteger(t.naturalHeight) &&
              (svgW !== t.naturalWidth || svgH !== t.naturalHeight)
            ) {
              addError(
                assetDisplayPath,
                `SVG width and height (${svgW}x${svgH}) do not match manifest naturalWidth and naturalHeight (${t.naturalWidth}x${t.naturalHeight})`,
              );
            }
          }
        }
      } catch (err) {
        addError(assetDisplayPath, `cannot read SVG file: ${err.message}`);
      }
    }
  }
}

if (errors.length > 0) {
  for (const err of errors) {
    console.error(err);
  }
  process.exit(1);
}

console.log(`ok: ${parsed.templates.length} templates`);
process.exit(0);
