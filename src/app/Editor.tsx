import { useState, useRef, type ChangeEvent } from 'react';
import type { TemplateManifest } from '../types/template';
import type { EditorSession } from './useEditorSession';
import { exportStill, exportMotion } from '../features/export/export';
import { CanvasStage } from '../components/CanvasStage';
import { ControlPanel } from '../components/ControlPanel';
import { TemplatePicker } from '../components/TemplatePicker';
import { Button } from '../components/Button';

export interface EditorProps {
  session: EditorSession;
  templates: TemplateManifest[];
  onBack: () => void;
}

export function Editor({ session, templates, onBack }: EditorProps) {
  const {
    media,
    template,
    manifest,
    transform,
    isLoading,
    error,
    minScale,
    maxScale,
    setMedia,
    setTemplate,
    setCustomTemplate,
    dispatchTransform,
  } = session;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleChangeMediaClick = () => {
    mediaInputRef.current?.click();
  };

  const handleMediaInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void setMedia(file);
    }
    e.target.value = '';
  };

  const handleDownloadStill = async () => {
    if (!template || !media || !manifest) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await exportStill(
        {
          template,
          media,
          manifest,
          transform,
        },
        'image/png',
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tweakbon-${manifest.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor gambar';
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMotion = async () => {
    if (!template || !media || !manifest) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const durationSeconds = 15;
      const blob = await exportMotion(
        {
          template,
          media,
          manifest,
          transform,
        },
        durationSeconds,
      );

      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tweakbon-${manifest.id}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor video';
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top navigation bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '3px solid var(--ink)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button type="button" variant="sand" size="sm" onClick={onBack}>
            Kembali
          </Button>
          <span style={{ fontSize: '20px', fontWeight: 900 }}>TWEAKBON</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            type="button"
            variant="sky"
            size="sm"
            onClick={() => setShowTemplatePicker((prev) => !prev)}
          >
            {showTemplatePicker ? 'Tutup pilihan template' : 'Ganti template'}
          </Button>
        </div>
      </header>

      {/* Hidden file input for changing photo/video */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        onChange={handleMediaInputChange}
        tabIndex={-1}
      />

      {/* Inline errors */}
      {(error || exportError) && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--sand)',
            border: '3px solid var(--ink)',
            borderRadius: 'var(--radius)',
            boxShadow: '3px 3px 0 var(--ink)',
            fontWeight: 800,
            fontSize: '14px',
            color: 'var(--ink)',
          }}
        >
          {error || exportError}
        </div>
      )}

      {/* Optional template picker panel in editor */}
      {showTemplatePicker && (
        <div
          style={{
            padding: '20px',
            border: '3px solid var(--ink)',
            borderRadius: 'var(--radius)',
            boxShadow: '4px 4px 0 var(--ink)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <TemplatePicker
            templates={templates}
            selectedTemplateId={manifest?.id ?? null}
            onSelectTemplate={(tpl) => {
              void setTemplate(tpl);
              setShowTemplatePicker(false);
            }}
            onSelectCustomFile={(file) => {
              void setCustomTemplate(file);
              setShowTemplatePicker(false);
            }}
          />
        </div>
      )}

      {/* Main editor work area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Canvas preview stage */}
        <section aria-label="Pratinjau twibbon" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {template && media && manifest ? (
            <CanvasStage
              template={template}
              media={media}
              manifest={manifest}
              transform={transform}
              onAction={dispatchTransform}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                border: '3px solid var(--ink)',
                borderRadius: 'var(--radius)',
                boxShadow: '4px 4px 0 var(--ink)',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontWeight: 800 }}>{isLoading ? 'Memuat media...' : 'Media belum siap'}</p>
            </div>
          )}
        </section>

        {/* Control panel */}
        <section aria-label="Pengaturan posisi dan ukuran">
          <ControlPanel
            scale={transform.scale}
            minScale={minScale}
            maxScale={maxScale}
            rotation={transform.rotation}
            flipX={transform.flipX}
            mediaKind={media?.kind}
            isExporting={isExporting}
            onZoom={(newScale) => dispatchTransform({ type: 'scale', scale: newScale })}
            onRotate={(deltaRadians) => dispatchTransform({ type: 'rotate', deltaRadians })}
            onFlip={() => dispatchTransform({ type: 'flip' })}
            onReset={() => dispatchTransform({ type: 'reset' })}
            onDownloadStill={handleDownloadStill}
            onDownloadMotion={media?.kind === 'video' ? handleDownloadMotion : undefined}
            onChangeMedia={handleChangeMediaClick}
          />
        </section>
      </div>
    </div>
  );
}
