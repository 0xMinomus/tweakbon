import { drawFrame, type FrameInput } from '../render/compositor';

function pickVideoMimeType(): string | undefined {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  for (const candidate of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function resolveVideoMimeType(grantedType?: string): string {
  if (!grantedType) return 'video/webm';
  const lower = grantedType.toLowerCase();
  if (lower.startsWith('video/mp4') && !lower.includes('avc1')) {
    return 'video/webm';
  }
  return grantedType;
}

export async function exportStill(
  input: FrameInput,
  mime: 'image/png' | 'image/jpeg' = 'image/png',
  quality?: number,
): Promise<Blob> {
  const width = input.manifest.naturalWidth || input.template.width;
  const height = input.manifest.naturalHeight || input.template.height;

  if (typeof OffscreenCanvas !== 'undefined' && typeof OffscreenCanvas.prototype.convertToBlob === 'function') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Gagal membuat 2D context untuk export.');
    drawFrame(ctx as unknown as CanvasRenderingContext2D, input, width, height);
    const blob = await canvas.convertToBlob({ type: mime, quality });
    if (!blob) throw new Error('Gagal menghasilkan file gambar.');
    return blob;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal membuat 2D context untuk export.');
  drawFrame(ctx, input, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal menghasilkan file gambar.'));
        } else {
          resolve(blob);
        }
      },
      mime,
      quality,
    );
  });
}

export function exportMotion(input: FrameInput, durationSeconds: number): Promise<Blob> {
  const width = input.manifest.naturalWidth || input.template.width;
  const height = input.manifest.naturalHeight || input.template.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder tidak didukung di peramban ini.');
  }
  if (typeof canvas.captureStream !== 'function') {
    throw new Error('captureStream tidak didukung di peramban ini.');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal membuat 2D context untuk export.');

  let duration = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : 15;

  if (input.template.kind === 'video') {
    const videoDuration = input.template.source.duration;
    if (Number.isFinite(videoDuration) && videoDuration > 0 && videoDuration < duration) {
      duration = videoDuration;
    }
  }

  duration = Math.min(30, Math.max(1, duration));

  const stream = canvas.captureStream(30);

  return new Promise<Blob>((resolve, reject) => {
    let animId = 0;
    let stopped = false;

    const cleanup = () => {
      if (stopped) return;
      stopped = true;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
      for (const track of stream.getTracks()) {
        track.stop();
      }
    };

    const mimeType = pickVideoMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(stream, options);
    } catch (err) {
      cleanup();
      reject(err);
      return;
    }

    const chunks: Blob[] = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      cleanup();
      reject(new Error('Perekaman video mengalami kesalahan.'));
    };

    recorder.onstop = () => {
      cleanup();
      const finalType = resolveVideoMimeType(recorder.mimeType);
      const blob = new Blob(chunks, { type: finalType });
      if (blob.size === 0) {
        reject(new Error('Gagal menghasilkan rekaman video.'));
      } else {
        resolve(blob);
      }
    };

    if (input.template.kind === 'video' && input.template.source.paused) {
      void input.template.source.play().catch(() => {});
    }

    drawFrame(ctx, input, width, height);

    try {
      recorder.start();
    } catch (err) {
      cleanup();
      reject(err);
      return;
    }

    const durationMs = duration * 1000;
    const startTime = performance.now();

    const onFrame = (now: number) => {
      drawFrame(ctx, input, width, height);
      const elapsed = now - startTime;
      if (elapsed >= durationMs) {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        return;
      }
      animId = requestAnimationFrame(onFrame);
    };

    animId = requestAnimationFrame(onFrame);
  });
}
