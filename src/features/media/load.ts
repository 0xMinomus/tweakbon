import type { MediaSource, TemplateImage } from '../../types/media';
import type { TemplateManifest } from '../../types/template';
import { detectSlotFromAlpha } from '../template/slot-detect';

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

export interface CustomTemplate {
  manifest: TemplateManifest;
  image: TemplateImage;
  release: () => void;
}

export async function loadCustomTemplateFile(file: File): Promise<CustomTemplate> {
  if (!isImageFile(file)) {
    throw new Error('Format file tidak didukung. Harap pilih file gambar (PNG, JPG, atau WebP).');
  }

  const objectUrl = URL.createObjectURL(file);
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Gagal membaca file gambar.');
  }

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
  if (!slot) {
    bitmap.close();
    URL.revokeObjectURL(objectUrl);
    throw new Error('Tidak ditemukan area transparan pada template. Harap gunakan file gambar dengan latar belakang transparan.');
  }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    bitmap.close();
    URL.revokeObjectURL(objectUrl);
  };

  const manifest: TemplateManifest = {
    id: 'custom',
    name: 'Template Kustom',
    kind: 'image',
    src: objectUrl,
    naturalWidth: width,
    naturalHeight: height,
    slot,
    defaultFit: 'cover',
  };

  const image: TemplateImage = {
    source: bitmap,
    width,
    height,
    release,
  };

  return {
    manifest,
    image,
    release,
  };
}
