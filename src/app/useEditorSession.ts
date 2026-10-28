import { useState, useRef, useEffect, useCallback } from 'react';
import type { PhotoMedia, TemplateSource } from '../types/media';
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
import * as mediaModule from '../features/media/load';

export interface EditorSession {
  media: PhotoMedia | null;
  template: TemplateSource | null;
  manifest: TemplateManifest | null;
  transform: TransformState;
  isLoading: boolean;
  error: string | null;
  minScale: number;
  maxScale: number;
  setMedia: (file: File) => Promise<void>;
  setCustomTemplate: (file: File) => Promise<void>;
  clearTemplate: () => void;
  clearMedia: () => void;
  dispatchTransform: (action: TransformAction) => void;
  clearError: () => void;
}

export function useEditorSession(initialManifest?: TemplateManifest | null): EditorSession {
  const [media, setMediaState] = useState<PhotoMedia | null>(null);
  const [template, setTemplateState] = useState<TemplateSource | null>(null);
  const [manifest, setManifestState] = useState<TemplateManifest | null>(initialManifest ?? null);
  const [transform, setTransform] = useState<TransformState>(createTransform());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep references to resources for idempotent cleanup
  const mediaRef = useRef<PhotoMedia | null>(null);
  const templateRef = useRef<TemplateSource | null>(null);
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

  // Set media (photo) file
  const setMedia = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        type MediaLoadModule = {
          loadPhotoFile?: (f: File) => Promise<PhotoMedia>;
          loadMediaFile?: (f: File) => Promise<PhotoMedia>;
        };
        const loadModule: MediaLoadModule = mediaModule;
        const loadPhoto = loadModule.loadPhotoFile ?? loadModule.loadMediaFile;
        if (!loadPhoto) {
          throw new Error('Fungsi pemuatan foto tidak tersedia');
        }

        const loadedPhoto = await loadPhoto(file);

        // Release previous photo
        if (mediaRef.current) {
          mediaRef.current.release();
        }

        mediaRef.current = loadedPhoto;
        setMediaState(loadedPhoto);

        // Reset transform for new photo
        setTransform(createTransform());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat foto';
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
        const custom = await mediaModule.loadCustomTemplateFile(file);

        if (templateRef.current) {
          templateRef.current.release();
        }
        if (customReleaseRef.current) {
          customReleaseRef.current();
        }

        type CustomTemplateResult = {
          manifest: TemplateManifest;
          release: () => void;
          template?: TemplateSource;
          image?: TemplateSource;
        };
        const result: CustomTemplateResult = custom;
        const templateSource = result.template ?? result.image;
        if (!templateSource) {
          throw new Error('Gagal memproses template kustom');
        }
        customReleaseRef.current = result.release;
        templateRef.current = templateSource;
        setTemplateState(templateSource);
        setManifestState(result.manifest);
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
    setCustomTemplate,
    clearTemplate,
    clearMedia,
    dispatchTransform,
    clearError,
  };
}
