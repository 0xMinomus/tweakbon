import { describe, expect, it, vi, beforeEach } from 'vitest';
import { drawFrame, type FrameInput } from './compositor';
import { bakeMaskedTemplate } from './masking';
import { drawKeyedVideoFrame } from './keying';
import type { PhotoMedia, VideoMedia, TemplateImage, TemplateVideo } from '../../types/media';
import type { TemplateManifest } from '../../types/template';
import type { TransformState, CutoutMask, ChromaKeySettings } from '../../types/editor';

vi.mock('./masking', () => ({
  bakeMaskedTemplate: vi.fn(),
}));

vi.mock('./keying', () => ({
  drawKeyedVideoFrame: vi.fn(),
  averageCornerColor: vi.fn(),
}));

interface RecordedCall {
  method: string;
  args: unknown[];
}

function createRecordingContext() {
  const calls: RecordedCall[] = [];
  const ctx = {
    calls,
    fillStyle: '',
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
    fillRect: (x: number, y: number, w: number, h: number) => {
      calls.push({ method: 'fillRect', args: [x, y, w, h] });
    },
    fill: () => {
      calls.push({ method: 'fill', args: [] });
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
  kind: 'image',
  source: fakeTemplateSource,
  width: 1000,
  height: 1000,
  release: () => {},
};

const baseMedia: PhotoMedia = {
  kind: 'photo',
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('draws plain photo media with no masking call and no keying call', () => {
    const ctx = createRecordingContext();
    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 500, 500);

    expect(bakeMaskedTemplate).not.toHaveBeenCalled();
    expect(drawKeyedVideoFrame).not.toHaveBeenCalled();

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(2);
    expect(drawCalls[0].args[0]).toBe(fakeMediaSource);
    expect(drawCalls[1].args).toEqual([fakeTemplateSource, 0, 0, 500, 500]);
  });

  it('draws the baked masked template exactly once when templateMask is present', () => {
    const ctx = createRecordingContext();
    const fakeBakedCanvas = {} as HTMLCanvasElement;
    vi.mocked(bakeMaskedTemplate).mockReturnValue(fakeBakedCanvas);

    const mask: CutoutMask = {
      width: 1000,
      height: 1000,
      alpha: new Uint8ClampedArray(1000 * 1000),
    };

    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
      templateMask: mask,
    };

    drawFrame(ctx, input, 500, 500);

    expect(bakeMaskedTemplate).toHaveBeenCalledTimes(1);
    expect(bakeMaskedTemplate).toHaveBeenCalledWith(baseTemplate, mask);

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(2);
    expect(drawCalls[0].args[0]).toBe(fakeMediaSource);
    expect(drawCalls[1].args).toEqual([fakeBakedCanvas, 0, 0, 500, 500]);
  });

  it('keys the video template and draws media plain behind it when templateChroma.enabled is true', () => {
    const ctx = createRecordingContext();
    const fakeVideo = { readyState: 2 } as HTMLVideoElement;
    const videoTemplate: TemplateVideo = {
      kind: 'video',
      source: fakeVideo,
      width: 1280,
      height: 720,
      release: () => {},
    };

    const chroma: ChromaKeySettings = {
      enabled: true,
      color: { r: 0, g: 255, b: 0 },
      similarity: 0.4,
      smoothness: 0.1,
      spill: 0.2,
    };

    const input: FrameInput = {
      template: videoTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
      templateChroma: chroma,
    };

    drawFrame(ctx, input, 800, 600);

    expect(bakeMaskedTemplate).not.toHaveBeenCalled();

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0].args[0]).toBe(fakeMediaSource);

    expect(drawKeyedVideoFrame).toHaveBeenCalledTimes(1);
    const expectedKeyCap = Math.min(2560, Math.max(800, 600));
    expect(drawKeyedVideoFrame).toHaveBeenCalledWith(
      ctx,
      fakeVideo,
      chroma,
      0,
      0,
      800,
      600,
      expectedKeyCap,
    );
  });

  it('draws raw template when video template has no chroma or chroma is disabled', () => {
    const ctx = createRecordingContext();
    const fakeVideo = { readyState: 2 } as HTMLVideoElement;
    const videoTemplate: TemplateVideo = {
      kind: 'video',
      source: fakeVideo,
      width: 1280,
      height: 720,
      release: () => {},
    };

    const input: FrameInput = {
      template: videoTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
      templateChroma: {
        enabled: false,
        color: { r: 0, g: 255, b: 0 },
        similarity: 0.4,
        smoothness: 0.1,
        spill: 0.2,
      },
    };

    drawFrame(ctx, input, 400, 400);

    expect(drawKeyedVideoFrame).not.toHaveBeenCalled();

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(2);
    expect(drawCalls[0].args[0]).toBe(fakeMediaSource);
    expect(drawCalls[1].args).toEqual([fakeVideo, 0, 0, 400, 400]);
  });

  it('draws no template layer when video template readyState is less than 2', () => {
    const ctx = createRecordingContext();
    const fakeVideo = { readyState: 1 } as HTMLVideoElement;
    const videoTemplate: TemplateVideo = {
      kind: 'video',
      source: fakeVideo,
      width: 1280,
      height: 720,
      release: () => {},
    };

    const input: FrameInput = {
      template: videoTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 400, 400);

    expect(drawKeyedVideoFrame).not.toHaveBeenCalled();

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0].args[0]).toBe(fakeMediaSource);
  });

  it('draws both photo and template when video template readyState is 2 or higher', () => {
    const ctx = createRecordingContext();
    const fakeVideo = { readyState: 2 } as HTMLVideoElement;

    const videoTemplate: TemplateVideo = {
      kind: 'video',
      source: fakeVideo,
      width: 1280,
      height: 720,
      release: () => {},
    };

    const input: FrameInput = {
      template: videoTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 400, 400);

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(2);
    expect(drawCalls[0].args[0]).toBe(fakeMediaSource);
    expect(drawCalls[1].args).toEqual([fakeVideo, 0, 0, 400, 400]);
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

  it('fills uncovered rect slot with #FFF8EC before media draw', () => {
    const ctx = createRecordingContext();
    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: { ...defaultTransform, scale: 0.5 },
    };

    drawFrame(ctx, input, 500, 500);

    expect(ctx.fillStyle).toBe('#FFF8EC');
    const fillRectIdx = ctx.calls.findIndex((c) => c.method === 'fillRect');
    const clipIdx = ctx.calls.findIndex((c) => c.method === 'clip');
    const mediaDrawIdx = ctx.calls.findIndex((c) => c.method === 'drawImage');

    expect(fillRectIdx).toBeGreaterThan(clipIdx);
    expect(fillRectIdx).toBeLessThan(mediaDrawIdx);
    expect(ctx.calls[fillRectIdx].args).toEqual([50, 50, 400, 400]);
  });

  it('fills uncovered polygon slot with #FFF8EC before media draw', () => {
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
      transform: { ...defaultTransform, scale: 0.5 },
    };

    drawFrame(ctx, input, 1000, 1000);

    expect(ctx.fillStyle).toBe('#FFF8EC');
    const fillIdx = ctx.calls.findIndex((c) => c.method === 'fill');
    const clipIdx = ctx.calls.findIndex((c) => c.method === 'clip');
    const mediaDrawIdx = ctx.calls.findIndex((c) => c.method === 'drawImage');

    expect(fillIdx).toBeGreaterThan(clipIdx);
    expect(fillIdx).toBeLessThan(mediaDrawIdx);
  });

  it('does not fill background when media covers slot', () => {
    const ctx = createRecordingContext();
    const input: FrameInput = {
      template: baseTemplate,
      media: baseMedia,
      manifest: baseManifest,
      transform: { ...defaultTransform, scale: 1 },
    };

    drawFrame(ctx, input, 500, 500);

    const hasFill = ctx.calls.some((c) => c.method === 'fillRect' || c.method === 'fill');
    expect(hasFill).toBe(false);
  });

  it('draws video user media directly when readyState is 2 or higher', () => {
    const ctx = createRecordingContext();
    const fakeUserVideo = { readyState: 2 } as HTMLVideoElement;
    const videoUserMedia: VideoMedia = {
      kind: 'video',
      source: fakeUserVideo,
      width: 1280,
      height: 720,
      duration: 10,
      release: () => {},
    };
    const input: FrameInput = {
      template: baseTemplate,
      media: videoUserMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 500, 500);

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(2);
    expect(drawCalls[0].args[0]).toBe(fakeUserVideo);
    expect(drawCalls[1].args[0]).toBe(fakeTemplateSource);
  });

  it('skips video user media drawing when readyState is less than 2', () => {
    const ctx = createRecordingContext();
    const fakeUserVideo = { readyState: 1 } as HTMLVideoElement;
    const videoUserMedia: VideoMedia = {
      kind: 'video',
      source: fakeUserVideo,
      width: 1280,
      height: 720,
      duration: 10,
      release: () => {},
    };
    const input: FrameInput = {
      template: baseTemplate,
      media: videoUserMedia,
      manifest: baseManifest,
      transform: defaultTransform,
    };

    drawFrame(ctx, input, 500, 500);

    const drawCalls = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0].args[0]).toBe(fakeTemplateSource);
  });
});
