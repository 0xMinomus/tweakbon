import { type ChangeEvent } from 'react';
import { Button } from './Button';

export interface ControlPanelProps {
  scale: number;
  minScale: number;
  maxScale: number;
  rotation: number;
  flipX: boolean;
  mediaKind?: 'image' | 'video';
  isExporting: boolean;
  onZoom: (newScale: number) => void;
  onRotate: (deltaRadians: number) => void;
  onFlip: () => void;
  onReset: () => void;
  onDownloadStill: () => void;
  onDownloadMotion?: () => void;
  onChangeMedia: () => void;
  className?: string;
}

export function ControlPanel({
  scale,
  minScale,
  maxScale,
  flipX,
  mediaKind = 'image',
  isExporting,
  onZoom,
  onRotate,
  onFlip,
  onReset,
  onDownloadStill,
  onDownloadMotion,
  onChangeMedia,
  className = '',
}: ControlPanelProps) {
  const hasMediaRecorder = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
  const showVideoDownload = mediaKind === 'video' && hasMediaRecorder && Boolean(onDownloadMotion);

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      onZoom(val);
    }
  };

  const handleZoomOut = () => {
    onZoom(Math.max(minScale, scale - 0.15));
  };

  const handleZoomIn = () => {
    onZoom(Math.min(maxScale, scale + 0.15));
  };

  const handleRotate90 = () => {
    // 90 degrees clockwise
    onRotate(Math.PI / 2);
  };

  return (
    <div
      className={`control-panel ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Zoom control */}
      <div
        style={{
          border: '3px solid var(--ink)',
          borderRadius: 'var(--radius)',
          boxShadow: '4px 4px 0 var(--ink)',
          backgroundColor: '#FFFFFF',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <label
            htmlFor="zoom-range"
            style={{
              fontSize: '14px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Ukuran Media
          </label>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              backgroundColor: 'var(--sand)',
              padding: '2px 8px',
              border: '2px solid var(--ink)',
              borderRadius: '2px',
            }}
          >
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            type="button"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= minScale}
            aria-label="Perkecil media"
          >
            -
          </Button>

          <input
            id="zoom-range"
            type="range"
            min={minScale}
            max={maxScale}
            step={0.05}
            value={scale}
            onChange={handleSliderChange}
            className="range-slider"
            aria-label="Atur perbesaran media"
          />

          <Button
            type="button"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= maxScale}
            aria-label="Perbesar media"
          >
            +
          </Button>
        </div>
      </div>

      {/* Transform buttons: Rotate, Flip, Reset */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '10px',
        }}
      >
        <Button
          type="button"
          variant="sky"
          size="sm"
          onClick={handleRotate90}
          aria-label="Putar 90 derajat searah jarum jam"
        >
          Putar 90°
        </Button>

        <Button
          type="button"
          variant={flipX ? 'accent' : 'secondary'}
          size="sm"
          onClick={onFlip}
          aria-label="Balik horizontal"
        >
          Balik
        </Button>

        <Button
          type="button"
          variant="sand"
          size="sm"
          onClick={onReset}
          aria-label="Atur ulang posisi dan ukuran"
        >
          Atur ulang
        </Button>
      </div>

      {/* Main Download actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onDownloadStill}
          disabled={isExporting}
          style={{ width: '100%' }}
        >
          {isExporting ? 'Memproses...' : 'Unduh gambar (PNG)'}
        </Button>

        {showVideoDownload && (
          <Button
            type="button"
            variant="mint"
            size="lg"
            onClick={onDownloadMotion}
            disabled={isExporting}
            style={{ width: '100%' }}
          >
            {isExporting ? 'Merekam video...' : 'Unduh video (15 detik)'}
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onChangeMedia}
          disabled={isExporting}
          style={{ width: '100%' }}
        >
          Ganti foto atau video
        </Button>
      </div>

      {/* Keyboard hints */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--ink)',
          opacity: 0.75,
          padding: '8px 12px',
          border: '2px solid var(--ink)',
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--paper)',
          lineHeight: '1.4',
        }}
      >
        Pintas keyboard pada kanvas: Tombol panah untuk geser (tahan Shift untuk geser lebih jauh), +/- untuk skala, R untuk putar, 0 untuk atur ulang.
      </div>
    </div>
  );
}
