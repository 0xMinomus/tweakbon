import { useState, useRef, useEffect, useCallback } from 'react';
import type { MediaSource, TemplateImage } from '../types/media';
import type { TemplateManifest } from '../types/template';
import type { TransformState } from '../types/editor';
import {
  createTransform,
  reduceTransform,
  MIN_SCALE,
  MAX_SCALE,
  type TransformAction,
  type TransformContext,
} from '../features/editor/transform';
import { loadMediaFile, loadTemplateImage } from '../features/media/load';
import { detectSlotFromAlpha } from '../features/template/slot-detect';

export interface EditorSession {
  media: MediaSource | null;
  template: TemplateImage | null;
  manifest: TemplateManifest | null;
  transform: TransformState;
  isLoading: boolean;
  error: string | null;
  minScale: number;
  maxScale: number;
  setMedia: (file: File) => Promise<void>;
  setTemplate: (manifest: TemplateManifest) => Promise<void>;
  setCustomTemplate: (file: File) => Promise<void>;
  dispatchTransform: (action: TransformAction) => void;
  clearError: () => void;
}

export function useEditorSession(initialManifest?: TemplateManifest | null): EditorSession {
  const [media, setMediaState] = useState<MediaSource | null>(null);
  const [template, setTemplateState] = useState<TemplateImage | null>(null);
  const [manifest, setManifestState] = useState<TemplateManifest | null>(initialManifest ?? null);
  const [transform, setTransform] = useState<TransformState>(createTransform());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep references to resources for idempotent cleanup
  const mediaRef = useRef<MediaSource | null>(null);
  const templateRef = useRef<TemplateImage | null>(null);
  const customUrlRef = useRef<string | null>(null);

  // Sync refs when states change
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      if (mediaRef.current) {
        mediaRef.current.release();
        mediaRef.current = null;
      }
      if (templateRef.current) {
        templateRef.current.release();
        templateRef.current = null;
      }
      if (customUrlRef.current) {
        URL.revokeObjectURL(customUrlRef.current);
        customUrlRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Dispatch transform action with slot and media context
  const dispatchTransform = useCallback(
    (action: TransformAction) => {
      const currentMedia = mediaRef.current;
      if (!currentMedia || !manifest) return;

      const slotW = manifest.slot.width * manifest.naturalWidth;
      const slotH = manifest.slot.height * manifest.naturalHeight;
      const slotAspect = slotH === 0 ? 1 : slotW / slotH;

      const context: TransformContext = {
        mediaWidth: currentMedia.width,
        mediaHeight: currentMedia.height,
        slotAspect,
      };

      setTransform((prev) => reduceTransform(prev, action, context));
    },
    [manifest],
  );

  // Set media file
  const setMedia = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedMedia = await loadMediaFile(file);

        // Release previous media
        if (mediaRef.current) {
          mediaRef.current.release();
        }

        mediaRef.current = loadedMedia;
        setMediaState(loadedMedia);

        // Reset transform for new media
        setTransform(createTransform());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat media';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Set template from manifest
  const setTemplate = useCallback(
    async (newManifest: TemplateManifest) => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedTemplate = await loadTemplateImage(newManifest.src);

        // Release previous template
        if (templateRef.current) {
          templateRef.current.release();
        }

        templateRef.current = loadedTemplate;
        setTemplateState(loadedTemplate);
        setManifestState(newManifest);

        // Reset transform to fit new slot
        setTransform(createTransform());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat template';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Set custom template from user PNG file
  const setCustomTemplate = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      let objectUrl: string | null = null;
      try {
        objectUrl = URL.createObjectURL(file);

        const img = new Image();
        img.src = objectUrl;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Gagal menyiapkan kanvas untuk membaca template');
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const detectedSlot = detectSlotFromAlpha({
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        });

        if (!detectedSlot) {
          URL.revokeObjectURL(objectUrl);
          setError('Tidak ditemukan area transparan pada template. Gunakan file PNG dengan latar belakang tembus pandang.');
          setIsLoading(false);
          return;
        }

        const customManifest: TemplateManifest = {
          id: 'custom',
          name: 'Template Kustom',
          kind: 'image',
          src: objectUrl,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          slot: detectedSlot,
          defaultFit: 'cover',
        };

        // Revoke older custom URL if present
        if (customUrlRef.current) {
          URL.revokeObjectURL(customUrlRef.current);
        }
        customUrlRef.current = objectUrl;

        const loadedTemplate = await loadTemplateImage(customManifest.src);

        if (templateRef.current) {
          templateRef.current.release();
        }

        templateRef.current = loadedTemplate;
        setTemplateState(loadedTemplate);
        setManifestState(customManifest);
        setTransform(createTransform());
      } catch (err) {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        const msg = err instanceof Error ? err.message : 'Gagal memproses template kustom';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    media,
    template,
    manifest,
    transform,
    isLoading,
    error,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    setMedia,
    setTemplate,
    setCustomTemplate,
    dispatchTransform,
    clearError,
  };
}
