import {
  useState,
  useRef,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { VideoMedia } from '../types/media';
import type { ChromaKeySettings, VideoTrim, Rgb } from '../types/editor';
import { drawKeyedVideoFrame } from '../features/render/keying';
import { Button } from './Button';

export interface VideoKeyEditorProps {
  media: VideoMedia;
  chroma: ChromaKeySettings;
  trim: VideoTrim;
  onChangeChroma: (next: ChromaKeySettings) => void;
  onChangeTrim: (next: VideoTrim) => void;
  onClose: () => void;
  className?: string;
}

function rgbToHex(color: Rgb): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`.toUpperCase();
}

function formatTime(sec: number): string {
  const totalSec = Math.max(0, Math.floor(sec));
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoKeyEditor({
  media,
  chroma,
  trim,
  onChangeChroma,
  onChangeTrim,
  onClose,
  className = '',
}: VideoKeyEditorProps) {
  const [isEyedropper, setIsEyedropper] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<number>(trim.start);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trimRef = useRef<VideoTrim>(trim);
  const chromaRef = useRef<ChromaKeySettings>(chroma);

  useEffect(() => {
    trimRef.current = trim;
  }, [trim]);

  useEffect(() => {
    chromaRef.current = chroma;
  }, [chroma]);

  // Ensure video is playing and muted
  useEffect(() => {
    const video = media.source;
    video.muted = true;
    const currentTrim = trimRef.current;
    if (video.currentTime < currentTrim.start || video.currentTime >= currentTrim.end) {
      video.currentTime = currentTrim.start;
    }
    void video.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  }, [media]);

  // rAF loop to draw keyed frames and track trim window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = media.width;
    canvas.height = media.height;

    let animId: number | null = null;
    let isMounted = true;
    let lastTimeUpdate = 0;

    const render = () => {
      if (!isMounted) return;

      const video = media.source;
      const currentTrim = trimRef.current;
      const currentChroma = chromaRef.current;

      const start = currentTrim.start;
      const end = currentTrim.end;

      if (video.currentTime >= end || video.currentTime < start) {
        video.currentTime = start;
      }

      const now = performance.now();
      if (now - lastTimeUpdate > 80) {
        setCurrentTimeDisplay(video.currentTime);
        lastTimeUpdate = now;
      }

      drawKeyedVideoFrame(ctx, video, currentChroma, 0, 0, canvas.width, canvas.height);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [media]);

  const togglePlay = () => {
    const video = media.source;
    if (video.paused) {
      void video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleCanvasPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isEyedropper) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    // Helper canvas bounded to <= 640px for reading pixel color
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(media.width, media.height));
    const hw = Math.max(1, Math.round(media.width * scale));
    const hh = Math.max(1, Math.round(media.height * scale));

    const helper = document.createElement('canvas');
    helper.width = hw;
    helper.height = hh;
    const hctx = helper.getContext('2d', { willReadFrequently: true });
    if (!hctx) return;

    hctx.drawImage(media.source, 0, 0, hw, hh);

    const sampleX = Math.max(0, Math.min(hw - 1, Math.round((cssX / rect.width) * hw)));
    const sampleY = Math.max(0, Math.min(hh - 1, Math.round((cssY / rect.height) * hh)));

    const pixel = hctx.getImageData(sampleX, sampleY, 1, 1).data;
    const pickedColor: Rgb = {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
    };

    onChangeChroma({
      ...chroma,
      enabled: true,
      color: pickedColor,
    });
    setIsEyedropper(false);
  };

  const handleStartChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(val, trim.end - 0.2));
    const rounded = Math.round(safeVal * 10) / 10;
    onChangeTrim({ start: rounded, end: trim.end });
    if (media.source.currentTime < rounded) {
      media.source.currentTime = rounded;
    }
  };

  const handleEndChange = (val: number) => {
    const safeVal = Math.min(media.duration, Math.max(val, trim.start + 0.2));
    const rounded = Math.round(safeVal * 10) / 10;
    onChangeTrim({ start: trim.start, end: rounded });
    if (media.source.currentTime >= rounded) {
      media.source.currentTime = trim.start;
    }
  };

  const colorHex = rgbToHex(chroma.color);

  return (
    <div
      className={`video-key-editor ${className}`}
      style={{
        border: '3px solid var(--ink)',
        borderRadius: 'var(--radius)',
        boxShadow: '4px 4px 0 var(--ink)',
        backgroundColor: '#FFFFFF',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 900 }}>Edit Latar & Klip Video</h3>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            backgroundColor: 'var(--sky)',
            border: '2px solid var(--ink)',
            borderRadius: 'var(--radius)',
            padding: '2px 8px',
            boxShadow: '2px 2px 0 var(--ink)',
          }}
        >
          {formatTime(currentTimeDisplay)} / {formatTime(media.duration)}
        </span>
      </div>

      {/* Video Preview Canvas with Checkerboard Background */}
      <div
        className="checkerboard-bg"
        style={{
          width: '100%',
          maxWidth: '480px',
          margin: '0 auto',
          border: '3px solid var(--ink)',
          borderRadius: 'var(--radius)',
          boxShadow: '4px 4px 0 var(--ink)',
          overflow: 'hidden',
          touchAction: 'none',
          position: 'relative',
          cursor: isEyedropper ? 'crosshair' : 'default',
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Pratinjau video dengan hapus latar"
          onPointerDown={handleCanvasPointerDown}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            aspectRatio: `${media.width} / ${media.height}`,
          }}
        />
        {isEyedropper && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              backgroundColor: 'var(--sun)',
              border: '2px solid var(--ink)',
              borderRadius: 'var(--radius)',
              boxShadow: '2px 2px 0 var(--ink)',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 800,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            Klik pada video untuk mengambil warna latar
          </div>
        )}
      </div>

      {/* Chroma Switch, Eyedropper & Color Swatch */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'var(--paper)',
          border: '2px solid var(--ink)',
          borderRadius: 'var(--radius)',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            type="button"
            size="sm"
            variant={chroma.enabled ? 'mint' : 'sand'}
            aria-pressed={chroma.enabled}
            onClick={() => onChangeChroma({ ...chroma, enabled: !chroma.enabled })}
            aria-label="Alihkan hapus warna latar"
          >
            {chroma.enabled ? 'Hapus latar: Aktif' : 'Hapus latar: Mati'}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={isEyedropper ? 'sun' : 'secondary'}
            aria-pressed={isEyedropper}
            onClick={() => setIsEyedropper(!isEyedropper)}
            aria-label="Ambil warna latar dari video"
          >
            {isEyedropper ? 'Membatalkan' : 'Ambil warna latar'}
          </Button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
              backgroundColor: '#FFFFFF',
              border: '2px solid var(--ink)',
              borderRadius: 'var(--radius)',
              padding: '4px 8px',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: colorHex,
                border: '2px solid var(--ink)',
                borderRadius: '2px',
              }}
              aria-hidden="true"
            />
            <span style={{ fontSize: '13px', fontWeight: 800 }}>{colorHex}</span>
          </div>
        </div>

        {/* Chroma Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="chroma-similarity" style={{ fontSize: '13px', fontWeight: 800 }}>
                Kekuatan
              </label>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>{Math.round(chroma.similarity * 100)}%</span>
            </div>
            <input
              id="chroma-similarity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={chroma.similarity}
              onChange={(e) => onChangeChroma({ ...chroma, similarity: Number(e.target.value) })}
              className="range-slider"
              aria-label="Kekuatan hapus warna"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="chroma-smoothness" style={{ fontSize: '13px', fontWeight: 800 }}>
                Kelembutan tepi
              </label>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>{Math.round(chroma.smoothness * 100)}%</span>
            </div>
            <input
              id="chroma-smoothness"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={chroma.smoothness}
              onChange={(e) => onChangeChroma({ ...chroma, smoothness: Number(e.target.value) })}
              className="range-slider"
              aria-label="Kelembutan tepi"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="chroma-spill" style={{ fontSize: '13px', fontWeight: 800 }}>
                Kurangi warna pinggir
              </label>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>{Math.round(chroma.spill * 100)}%</span>
            </div>
            <input
              id="chroma-spill"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={chroma.spill}
              onChange={(e) => onChangeChroma({ ...chroma, spill: Number(e.target.value) })}
              className="range-slider"
              aria-label="Kurangi warna pinggir"
            />
          </div>
        </div>
      </div>

      {/* Video Trim Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'var(--paper)',
          border: '2px solid var(--ink)',
          borderRadius: 'var(--radius)',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase' }}>Potong Klip</span>
          <Button
            type="button"
            size="sm"
            variant={isPlaying ? 'mint' : 'sand'}
            aria-pressed={isPlaying}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
          >
            {isPlaying ? 'Jeda' : 'Putar'}
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="trim-start" style={{ fontSize: '13px', fontWeight: 800 }}>
              Mulai
            </label>
            <span style={{ fontSize: '12px', fontWeight: 800 }}>{formatTime(trim.start)} ({trim.start.toFixed(1)}s)</span>
          </div>
          <input
            id="trim-start"
            type="range"
            min="0"
            max={Math.max(0, media.duration - 0.2)}
            step="0.1"
            value={trim.start}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="range-slider"
            aria-label="Titik mulai klip"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="trim-end" style={{ fontSize: '13px', fontWeight: 800 }}>
              Akhir
            </label>
            <span style={{ fontSize: '12px', fontWeight: 800 }}>{formatTime(trim.end)} ({trim.end.toFixed(1)}s)</span>
          </div>
          <input
            id="trim-end"
            type="range"
            min="0.2"
            max={media.duration}
            step="0.1"
            value={trim.end}
            onChange={(e) => handleEndChange(Number(e.target.value))}
            className="range-slider"
            aria-label="Titik akhir klip"
          />
        </div>
      </div>

      {/* Done Button */}
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={onClose}
        style={{ width: '100%' }}
        aria-label="Selesai mengedit video"
      >
        Selesai
      </Button>
    </div>
  );
}
