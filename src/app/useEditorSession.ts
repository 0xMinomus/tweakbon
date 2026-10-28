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
import { loadMediaFile, loadTemplateImage, loadCustomTemplateFile } from '../features/media/load';

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
  clearTemplate: () => void;
  clearMedia: () => void;
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
  const customReleaseRef = useRef<(() => void) | null>(null);

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
      if (customReleaseRef.current) {
        customReleaseRef.current();
        customReleaseRef.current = null;
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
        if (customReleaseRef.current) {
          customReleaseRef.current();
          customReleaseRef.current = null;
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

  // Set custom template using loadCustomTemplateFile
  const setCustomTemplate = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const custom = await loadCustomTemplateFile(file);

        if (templateRef.current) {
          templateRef.current.release();
        }
        if (customReleaseRef.current) {
          customReleaseRef.current();
        }

        customReleaseRef.current = custom.release;
        templateRef.current = custom.image;
        setTemplateState(custom.image);
        setManifestState(custom.manifest);
        setTransform(createTransform());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memproses template kustom';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const clearTemplate = useCallback(() => {
    if (templateRef.current) {
      templateRef.current.release();
      templateRef.current = null;
    }
    if (customReleaseRef.current) {
      customReleaseRef.current();
      customReleaseRef.current = null;
    }
    setTemplateState(null);
    setManifestState(null);
  }, []);

  const clearMedia = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.release();
      mediaRef.current = null;
    }
    setMediaState(null);
  }, []);

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
    clearTemplate,
    clearMedia,
    dispatchTransform,
    clearError,
  };
}
