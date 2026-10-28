import { describe, expect, it } from 'vitest';
import { buildTemplateManifest, type ManifestInput } from './build-manifest';

describe('buildTemplateManifest', () => {
  const baseSlot = { x: 0.2, y: 0.1, width: 0.6, height: 0.7 };

  it('builds manifest with image kind and default name', () => {
    const input: ManifestInput = {
      kind: 'image',
      width: 1080,
      height: 1350,
      slot: baseSlot,
    };

    const manifest = buildTemplateManifest(input);

    expect(manifest).toEqual({
      id: 'custom',
      name: 'Template Kustom',
      kind: 'image',
      src: '',
      naturalWidth: 1080,
      naturalHeight: 1350,
      slot: baseSlot,
      defaultFit: 'cover',
    });
  });

  it('builds manifest with video kind', () => {
    const input: ManifestInput = {
      kind: 'video',
      width: 720,
      height: 1280,
      slot: baseSlot,
    };

    const manifest = buildTemplateManifest(input);

    expect(manifest.kind).toBe('video');
    expect(manifest.id).toBe('custom');
    expect(manifest.src).toBe('');
    expect(manifest.defaultFit).toBe('cover');
  });

  it('uses custom name when provided', () => {
    const input: ManifestInput = {
      kind: 'image',
      width: 800,
      height: 600,
      slot: baseSlot,
      name: 'Wisuda 2026',
    };

    const manifest = buildTemplateManifest(input);

    expect(manifest.name).toBe('Wisuda 2026');
  });

  it('passes slot and dimensions through unchanged', () => {
    const customSlot = { x: 0.15, y: 0.25, width: 0.7, height: 0.5 };
    const input: ManifestInput = {
      kind: 'image',
      width: 1920,
      height: 1080,
      slot: customSlot,
    };

    const manifest = buildTemplateManifest(input);

    expect(manifest.naturalWidth).toBe(1920);
    expect(manifest.naturalHeight).toBe(1080);
    expect(manifest.slot).toEqual(customSlot);
  });
});
