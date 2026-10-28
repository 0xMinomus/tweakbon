import {
  useRef,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { drawFrame } from '../features/render/compositor';
import type { UserMedia, TemplateSource } from '../types/media';
import type { TemplateManifest } from '../types/template';
import type { TransformState, CutoutMask, ChromaKeySettings, VideoTrim } from '../types/editor';
import type { TransformAction } from '../features/editor/transform';
import { Button } from './Button';

export interface CanvasStageProps {
  template: TemplateSource;
  media: UserMedia;
  manifest: TemplateManifest;
  transform: TransformState;
  mask?: CutoutMask | null;
  chroma?: ChromaKeySettings;
  trim?: VideoTrim;
  onAction: (action: TransformAction) => void;
  className?: string;
}

export function CanvasStage({
  template,
  media,
  manifest,
  transform,
  mask,
  chroma,
  trim,
  onAction,
  className = '',
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active pointers map for drag & pinch
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(transform.scale);

  const [isPlaying, setIsPlaying] = useState(true);
  const trimRef = useRef<VideoTrim | undefined>(trim);

  useEffect(() => {
    trimRef.current = trim;
  }, [trim]);

  // Handle video media playback
  useEffect(() => {
    if (media.kind !== 'video') return;
    const video = media.source;
    video.muted = true;
    const currentTrim = trimRef.current;
    const start = currentTrim ? currentTrim.start : 0;
    if (video.currentTime < start) {
      video.currentTime = start;
    }
    void video.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  }, [media]);

  const togglePlay = () => {
    if (media.kind !== 'video') return;
    const video = media.source;
    if (video.paused) {
      void video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Render on transform change or continuously for video
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      // Ensure canvas pixel buffer matches display DPR
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (targetW > 0 && targetH > 0) {
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        drawFrame(
          ctx,
          {
            template,
            media,
            manifest,
            transform,
            mask,
            chroma,
            trim,
          },
          targetW,
          targetH,
        );
      }

      if (media.kind === 'video') {
        const video = media.source;
        const currentTrim = trimRef.current;
        const start = currentTrim ? currentTrim.start : 0;
        const end = currentTrim ? currentTrim.end : (media.duration || 1);
        if (video.currentTime >= end || video.currentTime < start) {
          video.currentTime = start;
        }
      }

      if (template.kind === 'video' || media.kind === 'video') {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      isMounted = false;
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [template, media, manifest, transform, mask, chroma, trim]);
  // Pointer event handlers
  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const points = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchStartScaleRef.current = transform.scale;
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const pointers = activePointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    const prevPos = pointers.get(e.pointerId);
    if (!prevPos) return;
    const currentPos = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, currentPos);

    if (pointers.size === 1) {
      // Single pointer drag
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const slotCssW = manifest.slot.width * rect.width;
      const slotCssH = manifest.slot.height * rect.height;

      if (slotCssW > 0 && slotCssH > 0) {
        const deltaX = (currentPos.x - prevPos.x) / slotCssW;
        const deltaY = (currentPos.y - prevPos.y) / slotCssH;

        onAction({ type: 'drag', deltaX, deltaY });
      }
    } else if (pointers.size === 2 && pinchStartDistRef.current !== null) {
      // Two-pointer pinch zoom
      const pts = Array.from(pointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

      if (pinchStartDistRef.current > 0) {
        const ratio = currentDist / pinchStartDistRef.current;
        const newScale = pinchStartScaleRef.current * ratio;
        onAction({ type: 'scale', scale: newScale });
      }
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
  };

  const handlePointerCancel = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
  };

  // Wheel zoom
  const handleWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    onAction({ type: 'scale', scale: transform.scale * zoomFactor });
  };

  // Keyboard navigation
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const shiftMultiplier = e.shiftKey ? 10 : 1;
    const baseStep = 0.02 * shiftMultiplier;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onAction({ type: 'drag', deltaX: -baseStep, deltaY: 0 });
        break;
      case 'ArrowRight':
        e.preventDefault();
        onAction({ type: 'drag', deltaX: baseStep, deltaY: 0 });
        break;
      case 'ArrowUp':
        e.preventDefault();
        onAction({ type: 'drag', deltaX: 0, deltaY: -baseStep });
        break;
      case 'ArrowDown':
        e.preventDefault();
        onAction({ type: 'drag', deltaX: 0, deltaY: baseStep });
        break;
      case '+':
      case '=':
        e.preventDefault();
        onAction({ type: 'scale', scale: transform.scale + (e.shiftKey ? 0.2 : 0.05) });
        break;
      case '-':
      case '_':
        e.preventDefault();
        onAction({ type: 'scale', scale: transform.scale - (e.shiftKey ? 0.2 : 0.05) });
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        onAction({ type: 'rotate', deltaRadians: Math.PI / 12 });
        break;
      case '0':
        e.preventDefault();
        onAction({ type: 'reset' });
        break;
      default:
        break;
    }
  };

  // Accessible description of the current placement
  const accessibleLabel = `Kanvas pratinjau twibbon untuk ${manifest.name}. Skala: ${Math.round(
    transform.scale * 100,
  )} persen. Geser horizontal: ${Math.round(transform.offsetX * 100)} persen. Geser vertikal: ${Math.round(
    transform.offsetY * 100,
  )} persen. Gunakan tombol panah untuk menggeser media.`;

  return (
    <div
      ref={containerRef}
      className={`canvas-stage-wrapper ${className}`}
      style={{
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {media.kind === 'video' && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <Button
            type="button"
            size="sm"
            variant={isPlaying ? 'mint' : 'sand'}
            onClick={togglePlay}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Jeda pemutaran video' : 'Putar video'}
          >
            {isPlaying ? 'Jeda' : 'Putar'}
          </Button>
        </div>
      )}
      <div
        style={{
          width: '100%',
          aspectRatio: `${manifest.naturalWidth} / ${manifest.naturalHeight}`,
          border: '3px solid var(--ink)',
          borderRadius: 'var(--radius)',
          boxShadow: '6px 6px 0 var(--ink)',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          touchAction: 'none',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={accessibleLabel}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
