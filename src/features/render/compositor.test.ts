import { describe, expect, it } from 'vitest';
import { drawFrame, type FrameInput } from './compositor';
import type { MediaSource, TemplateImage } from '../../types/media';
import type { TemplateManifest } from '../../types/template';
import type { TransformState } from '../../types/editor';

interface RecordedCall {
  method: string;
  args: unknown[];
}

function createRecordingContext() {
  const calls: RecordedCall[] = [];
  const ctx = {
    calls,
    clearRect: (x: number, y: number, w: number, h: number) => {
      calls.push({ method: 'clearRect', args: [x, y, w, h] });
    },
    save: () => {
      calls.push({ method: 'save', args: [] });
    },
    restore: () => {
      calls.push({ method: 'restore', args: [] });
    },
    beginPath: () => {
      calls.push({ method: 'beginPath', args: [] });
    },
    rect: (x: number, y: number, w: number, h: number) => {
      calls.push({ method: 'rect', args: [x, y, w, h] });
    },
    moveTo: (x: number, y: number) => {
      calls.push({ method: 'moveTo', args: [x, y] });
    },
    lineTo: (x: number, y: number) => {
      calls.push({ method: 'lineTo', args: [x, y] });
    },
    closePath: () => {
      calls.push({ method: 'closePath', args: [] });
    },
    clip: () => {
      calls.push({ method: 'clip', args: [] });
    },
    translate: (x: number, y: number) => {
      calls.push({ method: 'translate', args: [x, y] });
    },
    rotate: (angle: number) => {
      calls.push({ method: 'rotate', args: [angle] });
    },
    scale: (x: number, y: number) => {
      calls.push({ method: 'scale', args: [x, y] });
    },
    drawImage: (...args: unknown[]) => {
      calls.push({ method: 'drawImage', args });
    },
  } as unknown as CanvasRenderingContext2D & { calls: RecordedCall[] };

  return ctx;
}

const fakeTemplateSource = {} as ImageBitmap;
const fakeMediaSource = {} as ImageBitmap;

const baseTemplate: TemplateImage = {
  source: fakeTemplateSource,
  width: 1000,
  height: 1000,
  release: () => {},
};

const baseMedia: MediaSource = {
  kind: 'image',
  source: fakeMediaSource,
  width: 800,
  height: 600,
  release: () => {},
};

const baseManifest: TemplateManifest = {
  id: 'merdeka',
  name: 'Merdeka',
  kind: 'image',
  src: '/templates/merdeka.svg',
  naturalWidth: 1000,
  naturalHeight: 1000,
  slot: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
};

const defaultTransform: TransformState = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipX: false,
};

describe('compositor drawFrame', () => {
  it('asserts operation order: clear -> clip -> media -> restore -> template last covering full output', () => {
    const ctx = createRecordingContext();
    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 500, 500);

    const methods = ctx.calls.map((c) => c.method);

    expect(methods[0]).toBe('clearRect');
    expect(ctx.calls[0].args).toEqual([0, 0, 500, 500]);

    const clearIdx = methods.indexOf('clearRect');
    const saveIdx = methods.indexOf('save');
    const clipIdx = methods.indexOf('clip');
    const mediaDrawIdx = methods.indexOf('drawImage');
    const restoreIdx = methods.indexOf('restore');
    const templateDrawIdx = methods.lastIndexOf('drawImage');

    expect(clearIdx).toBeLessThan(saveIdx);
    expect(saveIdx).toBeLessThan(clipIdx);
    expect(clipIdx).toBeLessThan(mediaDrawIdx);
    expect(mediaDrawIdx).toBeLessThan(restoreIdx);
    expect(restoreIdx).toBeLessThan(templateDrawIdx);

    expect(ctx.calls[mediaDrawIdx].args[0]).toBe(fakeMediaSource);

    const templateCall = ctx.calls[templateDrawIdx];
    expect(templateCall.args).toEqual([fakeTemplateSource, 0, 0, 500, 500]);
    expect(templateDrawIdx).toBe(ctx.calls.length - 1);
  });

  it('clips to polygon when slotPolygon is present', () => {
    const ctx = createRecordingContext();
    const manifestWithPolygon: TemplateManifest = {
      ...baseManifest,
      slotPolygon: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.2 },
        { x: 0.5, y: 0.8 },
      ],
    };

    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: manifestWithPolygon,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 1000, 1000);

    const methods = ctx.calls.map((c) => c.method);
    expect(methods).toContain('beginPath');
    expect(methods).toContain('moveTo');
    expect(methods).toContain('lineTo');
    expect(methods).toContain('closePath');
    expect(methods).toContain('clip');
    expect(methods).not.toContain('rect');

    const moveToCall = ctx.calls.find((c) => c.method === 'moveTo');
    expect(moveToCall?.args).toEqual([200, 200]);

    const lineToCalls = ctx.calls.filter((c) => c.method === 'lineTo');
    expect(lineToCalls).toHaveLength(2);
    expect(lineToCalls[0].args).toEqual([800, 200]);
    expect(lineToCalls[1].args).toEqual([500, 800]);
  });

  it('skips media draw and still draws template when video readyState is 0', () => {
    const ctx = createRecordingContext();
    const fakeVideo = { readyState: 0 } as HTMLVideoElement;

    const videoMedia: MediaSource = {
      kind: 'video',
      source: fakeVideo,
      width: 1920,
      height: 1080,
      release: () => {},
    };

    const input: FrameInput = {
      template: baseTemplate,
      media: videoMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 600, 600);

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0].args).toEqual([fakeTemplateSource, 0, 0, 600, 600]);

    const methods = ctx.calls.map((c) => c.method);
    expect(methods).toEqual(['clearRect', 'drawImage']);
  });

  it('draws media when video readyState is 2 or higher', () => {
    const ctx = createRecordingContext();
    const fakeVideo = { readyState: 2 } as HTMLVideoElement;

    const videoMedia: MediaSource = {
      kind: 'video',
      source: fakeVideo,
      width: 1280,
      height: 720,
      release: () => {},
    };

    const input: FrameInput = {
      template: baseTemplate,
      media: videoMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 400, 400);

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(2);
    expect(drawCalls[0].args[0]).toBe(fakeVideo);
    expect(drawCalls[1].args).toEqual([fakeTemplateSource, 0, 0, 400, 400]);
  });

  it('applies rotation, flipX, and translation transform', () => {
    const ctx = createRecordingContext();
    const transform: TransformState = {
      offsetX: 0.1,
      offsetY: -0.2,
      scale: 1.5,
      rotation: Math.PI / 4,
      flipX: true,
    };

    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform,
    };

    drawFrame(ctx, input, 1000, 1000);

    const rotateCall = ctx.calls.find((c) => c.method === 'rotate');
    expect(rotateCall?.args).toEqual([Math.PI / 4]);

    const scaleCall = ctx.calls.find((c) => c.method === 'scale');
    expect(scaleCall?.args).toEqual([-1, 1]);

    const translateCall = ctx.calls.find((c) => c.method === 'translate');
    // center: (100 + 400) + 0.1 * 800 = 580, (100 + 400) - 0.2 * 800 = 340
    expect(translateCall?.args).toEqual([580, 340]);
  });

  it('returns early when output dimensions are zero or negative', () => {
    const ctx = createRecordingContext();
    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 0, 500);
    expect(ctx.calls).toHaveLength(0);

    drawFrame(ctx, input, 500, -10);
    expect(ctx.calls).toHaveLength(0);
  });
});
