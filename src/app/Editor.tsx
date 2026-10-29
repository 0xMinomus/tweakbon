import { useState, useRef, type ChangeEvent } from 'react';
import type { EditorSession } from './useEditorSession';
import { exportStill, exportMotion } from '../features/export/export';
import type { FrameInput } from '../features/render/compositor';
import { isUncovered, drawSizeInSlot } from '../features/editor/transform';
import { CanvasStage } from '../components/CanvasStage';
import { ControlPanel } from '../components/ControlPanel';
import { PhotoCutoutEditor } from '../components/PhotoCutoutEditor';
import { VideoKeyEditor } from '../components/VideoKeyEditor';
import { Button } from '../components/Button';
export interface EditorProps {
  session: EditorSession;
  onBack: () => void;
}

export function Editor({ session, onBack }: EditorProps) {
  const {
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
    minScale,
    maxScale,
    setMedia,
    setCustomTemplate,
    setTemplateChroma,
    setTemplateMask,
    setTrim,
    dispatchTransform,
  } = session;
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<'none' | 'template'>('none');

  const templateInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uncovered = (() => {
    if (!media || !manifest) return false;
    const slotAspect =
      (manifest.slot.width * manifest.naturalWidth) / (manifest.slot.height * manifest.naturalHeight);
    const draw = drawSizeInSlot(media.width, media.height, slotAspect, transform.scale);
    return isUncovered(transform, draw);
  })();

  const handleHeaderChangeTemplateClick = () => {
    templateInputRef.current?.click();
  };

  const handleTemplateInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void setCustomTemplate(file);
    }
    e.target.value = '';
  };

  const handleChangePhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void setMedia(file);
    }
    e.target.value = '';
  };

  const buildFrameInput = (): FrameInput | null => {
    if (!template || !media || !manifest) return null;
    const base: FrameInput = {
      template,
      media,
      manifest,
      transform,
    };
    if (template.kind === 'image') {
      base.templateMask = templateMask;
    } else if (template.kind === 'video') {
      base.templateChroma = templateChroma;
    }
    if (media.kind === 'video') {
      base.trim = trim;
    }
    return base;
  };

  const handleDownloadStill = async () => {
    const input = buildFrameInput();
    if (!input || !manifest) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await exportStill(input, 'image/png');
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
    const input = buildFrameInput();
    if (!input || !manifest || !media) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const durationSeconds = media.kind === 'video'
        ? Math.min(30, Math.max(1, trim.end - trim.start))
        : 15;
      const blob = await exportMotion(input, durationSeconds);

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
          <Button type="button" variant="sky" size="sm" onClick={handleHeaderChangeTemplateClick}>
            Ganti template
          </Button>
        </div>
      </header>

      {/* Hidden file inputs for changing template and photo */}
      <input
        ref={templateInputRef}
        type="file"
        accept="image/png,image/*,video/*"
        className="sr-only"
        onChange={handleTemplateInputChange}
        tabIndex={-1}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        onChange={handlePhotoInputChange}
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
              templateMask={templateMask}
              templateChroma={templateChroma}
              trim={trim}
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
            templateKind={manifest?.kind}
            mediaKind={media?.kind}
            templateNeedsHole={
              templateNeedsHole &&
              (template?.kind === 'image' ? templateMask === null : !templateChroma.enabled)
            }
            showVideoDownload={Boolean(manifest?.kind === 'video' || media?.kind === 'video')}
            isExporting={isExporting}
            isUncovered={uncovered}
            mediaDuration={media?.kind === 'video' ? media.duration : undefined}
            trim={trim}
            onZoom={(newScale) => dispatchTransform({ type: 'scale', scale: newScale })}
            onFit={() => dispatchTransform({ type: 'scale', scale: 1 })}
            onRotate={(deltaRadians) => dispatchTransform({ type: 'rotate', deltaRadians })}
            onFlip={() => dispatchTransform({ type: 'flip' })}
            onReset={() => dispatchTransform({ type: 'reset' })}
            onOpenTemplateBackground={() => setOpenPanel((prev) => (prev === 'template' ? 'none' : 'template'))}
            onChangeTrim={setTrim}
            onDownloadStill={handleDownloadStill}
            onDownloadMotion={handleDownloadMotion}
            onChangePhoto={handleChangePhotoClick}
          />

          {openPanel === 'template' && template?.kind === 'image' && (
            <div style={{ marginTop: '20px' }}>
              <PhotoCutoutEditor
                template={template}
                mask={templateMask}
                onChange={setTemplateMask}
                onClose={() => setOpenPanel('none')}
              />
            </div>
          )}

          {openPanel === 'template' && template?.kind === 'video' && (
            <div style={{ marginTop: '20px' }}>
              <VideoKeyEditor
                template={template}
                chroma={templateChroma}
                onChangeChroma={setTemplateChroma}
                onClose={() => setOpenPanel('none')}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
