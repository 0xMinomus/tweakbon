import type { PhotoMedia, VideoMedia, TemplateImage, TemplateSource, TemplateVideo } from '../../types/media';
import type { TemplateManifest } from '../../types/template';
import { detectSlotFromAlpha } from '../template/slot-detect';
import { buildTemplateManifest } from '../template/build-manifest';

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export async function loadPhotoFile(file: File): Promise<PhotoMedia> {
  if (isVideoFile(file) || !isImageFile(file)) {
    throw new Error('Gunakan file foto (JPG, PNG).');
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch((err: unknown) => {
    throw new Error('Gagal membaca file foto. Pastikan format file adalah JPG atau PNG.', { cause: err });
  });

  let released = false;
  return {
    kind: 'photo',
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => {
      if (released) return;
      released = true;
      bitmap.close();
    },
  };
}

export async function loadVideoFile(file: File): Promise<VideoMedia> {
  if (!isVideoFile(file)) {
    throw new Error('Gunakan file video (MP4, WebM, atau MOV).');
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  const waitForStage = (event: string, timeoutMs: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      let timer = 0;
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener(event, onEvent);
        video.removeEventListener('error', onError);
      };
      const onEvent = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Gagal memuat video. Pastikan format file valid dan tidak rusak.'));
      };
      timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Gagal memuat video. Pastikan format file valid dan tidak rusak.'));
      }, timeoutMs);

      video.addEventListener(event, onEvent, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
  };

  try {
    const metaPromise = waitForStage('loadedmetadata', 8000);
    video.src = objectUrl;
    await metaPromise;

    if (video.readyState < 2) {
      await waitForStage('loadeddata', 8000);
    }

    const duration = video.duration;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!Number.isFinite(duration) || duration <= 0 || width <= 0 || height <= 0) {
      throw new Error('Video tidak memiliki durasi atau dimensi yang valid.');
    }

    return {
      kind: 'video',
      source: video,
      width,
      height,
      duration,
      release,
    };
  } catch (err) {
    release();
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Gagal memuat video. Pastikan format file valid dan tidak rusak.', { cause: err });
  }
}

export async function loadTemplateImage(src: string): Promise<TemplateImage> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Gagal memuat template: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob).catch(async () => {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  let released = false;
  return {
    kind: 'image',
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => {
      if (released) return;
      released = true;
      bitmap.close();
    },
  };
}

export interface CustomTemplate {
  manifest: TemplateManifest;
  template: TemplateSource;
  /** True when the file carried no alpha hole; the user must key or erase one. */
  needsHole: boolean;
  release: () => void;
}

export async function loadCustomTemplateFile(file: File): Promise<CustomTemplate> {
  if (isVideoFile(file)) {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    try {
      await new Promise<void>((resolve, reject) => {
        const pending = { timer: 0 };
        const cleanup = () => {
          window.clearTimeout(pending.timer);
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onError);
        };
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('Gagal memuat video template. Format file tidak valid atau rusak.'));
        };
        pending.timer = window.setTimeout(() => {
          cleanup();
          reject(new Error('Gagal membaca frame pertama video template.'));
        }, 3000);
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.src = objectUrl;
      });

      if (video.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const pending = { timer: 0 };
          const cleanup = () => {
            window.clearTimeout(pending.timer);
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
          };
          const onLoaded = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error('Gagal memuat video template. Format file tidak valid atau rusak.'));
          };
          pending.timer = window.setTimeout(() => {
            cleanup();
            reject(new Error('Gagal membaca frame pertama video template.'));
          }, 3000);
          video.addEventListener('loadeddata', onLoaded, { once: true });
          video.addEventListener('error', onError, { once: true });
        });
      }

      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Gagal membaca frame pertama video template.');
      }

      const targetTime = Math.min(0.1, duration / 2);
      await new Promise<void>((resolve, reject) => {
        const pending = { timer: 0 };
        const cleanup = () => {
          window.clearTimeout(pending.timer);
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
        };
        const onSeeked = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('Gagal membaca frame pertama video template.'));
        };
        pending.timer = window.setTimeout(() => {
          cleanup();
          reject(new Error('Gagal membaca frame pertama video template.'));
        }, 3000);
        video.addEventListener('seeked', onSeeked, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.currentTime = targetTime;
      });

      const width = video.videoWidth || video.width;
      const height = video.videoHeight || video.height;

      if (width <= 0 || height <= 0) {
        throw new Error('Gagal membaca dimensi video template.');
      }

      let imageData: ImageData;
      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Gagal memproses video template.');
        }
        ctx.drawImage(video, 0, 0, width, height);
        imageData = ctx.getImageData(0, 0, width, height);
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Gagal memproses video template.');
        }
        ctx.drawImage(video, 0, 0, width, height);
        imageData = ctx.getImageData(0, 0, width, height);
      }

      const slot = detectSlotFromAlpha({
        width,
        height,
        data: imageData.data,
      });
      const needsHole = slot === null;

      const manifest: TemplateManifest = {
        ...buildTemplateManifest(
          slot
            ? {
                kind: 'video',
                width,
                height,
                slot,
              }
            : {
                kind: 'video',
                width,
                height,
              },
        ),
        src: objectUrl,
      };

      video.currentTime = 0;
      try {
        await video.play();
      } catch {
        // Autoplay policy fallback
      }

      const template: TemplateVideo = {
        kind: 'video',
        source: video,
        width,
        height,
        release,
      };

      return {
        manifest,
        template,
        needsHole,
        release,
      };
    } catch (err) {
      release();
      throw err;
    }
  }

  if (isImageFile(file)) {
    const objectUrl = URL.createObjectURL(file);
    const bitmap = await createImageBitmap(file).catch((err: unknown) => {
      URL.revokeObjectURL(objectUrl);
      throw new Error('Gagal membaca file gambar.', { cause: err });
    });

    const width = bitmap.width;
    const height = bitmap.height;
    let imageData: ImageData;

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        URL.revokeObjectURL(objectUrl);
        throw new Error('Gagal memproses gambar template.');
      }
      ctx.drawImage(bitmap, 0, 0);
      imageData = ctx.getImageData(0, 0, width, height);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        URL.revokeObjectURL(objectUrl);
        throw new Error('Gagal memproses gambar template.');
      }
      ctx.drawImage(bitmap, 0, 0);
      imageData = ctx.getImageData(0, 0, width, height);
    }

    const slot = detectSlotFromAlpha({
      width,
      height,
      data: imageData.data,
    });
    const needsHole = slot === null;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      bitmap.close();
      URL.revokeObjectURL(objectUrl);
    };

    const manifest: TemplateManifest = {
      ...buildTemplateManifest(
        slot
          ? {
              kind: 'image',
              width,
              height,
              slot,
            }
          : {
              kind: 'image',
              width,
              height,
            },
      ),
      src: objectUrl,
    };

    const template: TemplateImage = {
      kind: 'image',
      source: bitmap,
      width,
      height,
      release,
    };

    return {
      manifest,
      template,
      needsHole,
      release,
    };
  }

  throw new Error('Format file tidak didukung. Harap pilih file gambar (PNG) atau video (MP4).');
}
