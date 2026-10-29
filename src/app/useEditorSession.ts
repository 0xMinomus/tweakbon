import { useState, useRef, useEffect, useCallback } from 'react';
import type { UserMedia, TemplateSource } from '../types/media';
import type { TemplateManifest } from '../types/template';
import type { TransformState, ChromaKeySettings, VideoTrim, CutoutMask } from '../types/editor';
import {
  createTransform,
  reduceTransform,
  MIN_SCALE,
  MAX_SCALE,
  type TransformAction,
  type TransformContext,
} from '../features/editor/transform';
import { loadPhotoFile, loadVideoFile, loadCustomTemplateFile } from '../features/media/load';
import { averageCornerColor } from '../features/render/keying';
import { DEFAULT_CHROMA_KEY } from '../features/editor/chroma';

export interface EditorSession {
  media: UserMedia | null;
  template: TemplateSource | null;
  manifest: TemplateManifest | null;
  transform: TransformState;
  templateChroma: ChromaKeySettings;
  templateMask: CutoutMask | null;
  templateNeedsHole: boolean;
  trim: VideoTrim;
  isLoading: boolean;
  error: string | null;
  minScale: number;
  maxScale: number;
  setMedia: (file: File) => Promise<void>;
  setCustomTemplate: (file: File) => Promise<void>;
  clearTemplate: () => void;
  clearMedia: () => void;
  setTemplateChroma: (next: ChromaKeySettings) => void;
  setTemplateMask: (next: CutoutMask | null) => void;
  setTrim: (next: VideoTrim) => void;
  dispatchTransform: (action: TransformAction) => void;
  clearError: () => void;
}

export function useEditorSession(initialManifest?: TemplateManifest | null): EditorSession {
  const [media, setMediaState] = useState<UserMedia | null>(null);
  const [template, setTemplateState] = useState<TemplateSource | null>(null);
  const [manifest, setManifestState] = useState<TemplateManifest | null>(initialManifest ?? null);
  const [transform, setTransform] = useState<TransformState>(createTransform());
  const [templateChroma, setTemplateChroma] = useState<ChromaKeySettings>(DEFAULT_CHROMA_KEY);
  const [templateMask, setTemplateMask] = useState<CutoutMask | null>(null);
  const [templateNeedsHole, setTemplateNeedsHole] = useState<boolean>(false);
  const [trim, setTrim] = useState<VideoTrim>({ start: 0, end: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep references to resources for idempotent cleanup
  const mediaRef = useRef<UserMedia | null>(null);
  const templateRef = useRef<TemplateSource | null>(null);
  const customReleaseRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Sync refs when states change
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  // Clean up all resources on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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

  // Set media (photo or video) file
  const setMedia = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

        if (isVideo) {
          const loadedVideo = await loadVideoFile(file);
          if (!isMountedRef.current) {
            loadedVideo.release();
            return;
          }

          if (mediaRef.current) {
            mediaRef.current.release();
          }

          mediaRef.current = loadedVideo;
          setMediaState(loadedVideo);
          setTransform(createTransform());
          setTrim({ start: 0, end: loadedVideo.duration });
        } else {
          const loadedPhoto = await loadPhotoFile(file);
          if (!isMountedRef.current) {
            loadedPhoto.release();
            return;
          }

          if (mediaRef.current) {
            mediaRef.current.release();
          }

          mediaRef.current = loadedPhoto;
          setMediaState(loadedPhoto);
          setTransform(createTransform());
          setTrim({ start: 0, end: 1 });
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Gagal memuat media';
        setError(msg);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
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
        if (!isMountedRef.current) {
          custom.release();
          return;
        }

        if (templateRef.current) {
          templateRef.current.release();
        }
        if (customReleaseRef.current) {
          customReleaseRef.current();
        }

        const templateSource = custom.template;
        customReleaseRef.current = custom.release;
        templateRef.current = templateSource;
        setTemplateState(templateSource);
        setManifestState(custom.manifest);
        setTransform(createTransform());
        setTemplateMask(null);
        setTemplateNeedsHole(custom.needsHole);
        if (templateSource.kind === 'video') {
          setTemplateChroma({
            ...DEFAULT_CHROMA_KEY,
            enabled: custom.needsHole,
            color: averageCornerColor(templateSource.source),
          });
        } else {
          setTemplateChroma(DEFAULT_CHROMA_KEY);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Gagal memproses template kustom';
        setError(msg);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
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
    setTemplateChroma(DEFAULT_CHROMA_KEY);
    setTemplateMask(null);
    setTemplateNeedsHole(false);
  }, []);

  const clearMedia = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.release();
      mediaRef.current = null;
    }
    setMediaState(null);
    setTrim({ start: 0, end: 1 });
    setTransform(createTransform());
  }, []);

  return {
    media,
    template,
    manifest,
    transform,
    templateChroma,
    templateMask,
    templateNeedsHole,
    trim,
    isLoading,
    error,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    setMedia,
    setCustomTemplate,
    clearTemplate,
    clearMedia,
    setTemplateChroma,
    setTemplateMask,
    setTrim,
    dispatchTransform,
    clearError,
  };
}
