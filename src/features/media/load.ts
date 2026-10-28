import type { MediaSource, TemplateImage } from '../../types/media';

const UNSUPPORTED_MESSAGE = 'Format file tidak didukung. Harap pilih file JPG, PNG, atau MP4.';

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export async function loadMediaFile(file: File): Promise<MediaSource> {
  if (isImageFile(file)) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
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
        const onLoadedMetadata = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('Gagal memuat video. Format file tidak valid atau rusak.'));
        };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.src = objectUrl;
      });

      await video.play();

      return {
        kind: 'video',
        source: video,
        width: video.videoWidth || video.width,
        height: video.videoHeight || video.height,
        release,
      };
    } catch (err) {
      release();
      throw err;
    }
  }

  throw new Error(UNSUPPORTED_MESSAGE);
}

export async function loadTemplateImage(src: string): Promise<TemplateImage> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Gagal memuat template: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      bitmap = await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  let released = false;
  return {
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
