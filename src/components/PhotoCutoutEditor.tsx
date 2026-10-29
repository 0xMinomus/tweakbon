import {
  useState,
  useRef,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { TemplateImage } from '../types/media';
import type { CutoutMask, MaskPoint } from '../types/editor';
import {
  createMask,
  cloneMask,
  magicWandErase,
  autoEraseBackground,
  strokeMask,
  maskCoverage,
} from '../features/editor/cutout';
import { Button } from './Button';

export interface PhotoCutoutEditorProps {
  template: TemplateImage;
  mask: CutoutMask | null;
  onChange: (next: CutoutMask) => void;
  onClose: () => void;
  className?: string;
}

type CutoutMode = 'wand' | 'erase' | 'restore';

export function PhotoCutoutEditor({
  template,
  mask,
  onChange,
  onClose,
  className = '',
}: PhotoCutoutEditorProps) {
  const [mode, setMode] = useState<CutoutMode>('wand');
  const [tolerance, setTolerance] = useState<number>(0.25);
  const [brushSize, setBrushSize] = useState<number>(28);

  const workScale = Math.min(1, 2048 / Math.max(template.width, template.height));
  const workW = Math.max(1, Math.round(template.width * workScale));
  const workH = Math.max(1, Math.round(template.height * workScale));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Uint8ClampedArray | null>(null);
  const maskRef = useRef<CutoutMask | null>(mask);
  const isDraggingRef = useRef<boolean>(false);
  const lastPointRef = useRef<MaskPoint | null>(null);

  useEffect(() => {
    maskRef.current = mask;
  }, [mask]);

  // When mask is null, create one at work resolution and notify parent
  useEffect(() => {
    if (!mask) {
      const initial = createMask(workW, workH);
      maskRef.current = initial;
      onChange(initial);
    }
  }, [mask, workW, workH, onChange]);

  // Cache source pixels from template.source at working resolution
  useEffect(() => {
    const helper = document.createElement('canvas');
    helper.width = workW;
    helper.height = workH;
    const ctx = helper.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(template.source, 0, 0, workW, workH);
      pixelsRef.current = ctx.getImageData(0, 0, workW, workH).data;
    }
  }, [template, workW, workH]);

  // Redraw preview canvas whenever mask or template updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== workW || canvas.height !== workH) {
      canvas.width = workW;
      canvas.height = workH;
    }

    if (!pixelsRef.current) {
      const helper = document.createElement('canvas');
      helper.width = workW;
      helper.height = workH;
      const hctx = helper.getContext('2d', { willReadFrequently: true });
      if (hctx) {
        hctx.drawImage(template.source, 0, 0, workW, workH);
        pixelsRef.current = hctx.getImageData(0, 0, workW, workH).data;
      }
    }

    const pixels = pixelsRef.current;
    if (!pixels) return;

    if (!mask) {
      ctx.drawImage(template.source, 0, 0, workW, workH);
      return;
    }

    const imgData = ctx.createImageData(workW, workH);
    const data = imgData.data;
    const alpha = mask.alpha;
    const totalPixels = workW * workH;

    for (let i = 0; i < totalPixels; i++) {
      const p = i * 4;
      data[p] = pixels[p];
      data[p + 1] = pixels[p + 1];
      data[p + 2] = pixels[p + 2];
      data[p + 3] = Math.round((pixels[p + 3] * alpha[i]) / 255);
    }

    ctx.putImageData(imgData, 0, 0);
  }, [template, mask, workW, workH]);

  const getTemplatePoint = (e: ReactPointerEvent<HTMLCanvasElement>): { pt: MaskPoint; rectWidth: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const scaleX = workW / rect.width;
    const scaleY = workH / rect.height;

    const x = Math.max(0, Math.min(workW - 1, Math.round(cssX * scaleX)));
    const y = Math.max(0, Math.min(workH - 1, Math.round(cssY * scaleY)));
    return { pt: { x, y }, rectWidth: rect.width };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const info = getTemplatePoint(e);
    if (!info) return;
    const { pt, rectWidth } = info;

    const currentMask = maskRef.current ?? mask;
    if (!currentMask) return;

    if (mode === 'wand') {
      const pixels = pixelsRef.current;
      if (!pixels) return;
      const nextMask = cloneMask(currentMask);
      const changed = magicWandErase(nextMask, pixels, workW, workH, pt.x, pt.y, tolerance);
      if (changed) {
        maskRef.current = nextMask;
        onChange(nextMask);
      }
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    lastPointRef.current = pt;

    const nextMask = cloneMask(currentMask);
    const radiusPx = Math.max(1, Math.round((brushSize / 2) * (workW / rectWidth)));
    const keep = mode === 'restore';
    strokeMask(nextMask, pt, pt, radiusPx, keep);
    maskRef.current = nextMask;
    onChange(nextMask);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || mode === 'wand') return;
    const info = getTemplatePoint(e);
    const lastPt = lastPointRef.current;
    if (!info || !lastPt) return;
    const { pt, rectWidth } = info;

    const currentMask = maskRef.current ?? mask;
    if (!currentMask) return;

    const nextMask = cloneMask(currentMask);
    const radiusPx = Math.max(1, Math.round((brushSize / 2) * (workW / rectWidth)));
    const keep = mode === 'restore';
    strokeMask(nextMask, lastPt, pt, radiusPx, keep);
    lastPointRef.current = pt;
    maskRef.current = nextMask;
    onChange(nextMask);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      isDraggingRef.current = false;
      lastPointRef.current = null;
    }
  };

  const handleAuto = () => {
    const pixels = pixelsRef.current;
    const currentMask = maskRef.current ?? mask;
    if (!pixels || !currentMask) return;
    const nextMask = cloneMask(currentMask);
    const count = autoEraseBackground(nextMask, pixels, workW, workH, tolerance);
    if (count > 0) {
      maskRef.current = nextMask;
      onChange(nextMask);
    }
  };

  const handleReset = () => {
    const nextMask = createMask(workW, workH);
    maskRef.current = nextMask;
    onChange(nextMask);
  };

  const coveragePercent = mask ? Math.round(maskCoverage(mask) * 100) : 100;
  return (
    <div
      className={`photo-cutout-editor ${className}`}
      style={{
        border: '3px solid var(--ink)',
        borderRadius: 'var(--radius)',
        boxShadow: '4px 4px 0 var(--ink)',
        backgroundColor: '#FFFFFF',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header with Title and Coverage Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 900 }}>Hapus Latar Template</h3>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            backgroundColor: 'var(--mint)',
            border: '2px solid var(--ink)',
            borderRadius: 'var(--radius)',
            padding: '2px 8px',
            boxShadow: '2px 2px 0 var(--ink)',
          }}
        >
          Sisa template: {coveragePercent}%
        </span>
      </div>

      {/* Preview Canvas with Checkerboard Background */}
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
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Pratinjau penghapusan latar template"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            aspectRatio: `${template.width} / ${template.height}`,
          }}
        />
      </div>

      {/* Mode Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        <Button
          type="button"
          size="sm"
          variant={mode === 'wand' ? 'sun' : 'secondary'}
          aria-pressed={mode === 'wand'}
          onClick={() => setMode('wand')}
          aria-label="Pilih mode magic wand"
        >
          Magic wand
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'erase' ? 'sun' : 'secondary'}
          aria-pressed={mode === 'erase'}
          onClick={() => setMode('erase')}
          aria-label="Pilih mode kuas hapus"
        >
          Kuas hapus
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'restore' ? 'sun' : 'secondary'}
          aria-pressed={mode === 'restore'}
          onClick={() => setMode('restore')}
          aria-label="Pilih mode kuas kembali"
        >
          Kuas kembali
        </Button>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="cutout-tolerance" style={{ fontSize: '13px', fontWeight: 800 }}>
              Toleransi warna
            </label>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                backgroundColor: 'var(--sand)',
                padding: '1px 6px',
                border: '1px solid var(--ink)',
                borderRadius: '2px',
              }}
            >
              {Math.round(tolerance * 100)}%
            </span>
          </div>
          <input
            id="cutout-tolerance"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="range-slider"
            aria-label="Atur toleransi warna"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="cutout-brush" style={{ fontSize: '13px', fontWeight: 800 }}>
              Ukuran kuas
            </label>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                backgroundColor: 'var(--sand)',
                padding: '1px 6px',
                border: '1px solid var(--ink)',
                borderRadius: '2px',
              }}
            >
              {brushSize} px
            </span>
          </div>
          <input
            id="cutout-brush"
            type="range"
            min="4"
            max="80"
            step="1"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="range-slider"
            aria-label="Atur ukuran kuas"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <Button
          type="button"
          variant="sky"
          size="md"
          onClick={handleAuto}
          aria-label="Hapus latar otomatis"
        >
          Otomatis
        </Button>
        <Button
          type="button"
          variant="sand"
          size="md"
          onClick={handleReset}
          aria-label="Atur ulang mask template"
        >
          Reset
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onClose}
          aria-label="Selesai mengedit latar template"
        >
          Selesai
        </Button>
      </div>
    </div>
  );
}
