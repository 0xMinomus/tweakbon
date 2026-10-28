import { useRef, useEffect } from 'react';
import type { TemplateManifest } from '../types/template';
import type { MediaSource } from '../types/media';
import { DropPane } from '../components/DropPane';
import { TemplatePicker } from '../components/TemplatePicker';
import { Button } from '../components/Button';

export interface HeroProps {
  templates: TemplateManifest[];
  manifest: TemplateManifest | null;
  media: MediaSource | null;
  onSelectTemplate: (template: TemplateManifest) => void;
  onSelectCustomTemplate: (file: File) => void;
  onClearTemplate: () => void;
  onSelectMediaFile: (file: File) => void;
  onClearMedia: () => void;
  onProceedToEditor: () => void;
}

function MediaThumbnail({ media }: { media: MediaSource }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !media) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxDim = 140;
    const aspect = media.width / media.height;
    let w = maxDim;
    let h = maxDim;
    if (aspect >= 1) {
      h = Math.max(20, Math.round(maxDim / aspect));
    } else {
      w = Math.max(20, Math.round(maxDim * aspect));
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(media.source, 0, 0, w, h);
  }, [media]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxHeight: '140px',
        maxWidth: '100%',
        border: '2px solid var(--ink)',
        borderRadius: 'var(--radius)',
        boxShadow: '2px 2px 0 var(--ink)',
        backgroundColor: '#FFFFFF',
      }}
    />
  );
}

function TemplateThumbnail({ manifest }: { manifest: TemplateManifest }) {
  return (
    <div
      style={{
        height: '140px',
        maxWidth: '100%',
        aspectRatio: `${manifest.naturalWidth} / ${manifest.naturalHeight}`,
        border: '2px solid var(--ink)',
        borderRadius: 'var(--radius)',
        boxShadow: '2px 2px 0 var(--ink)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={manifest.src}
        alt={manifest.name}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}

export function Hero({
  templates,
  manifest,
  media,
  onSelectTemplate,
  onSelectCustomTemplate,
  onClearTemplate,
  onSelectMediaFile,
  onClearMedia,
  onProceedToEditor,
}: HeroProps) {
  const isReady = Boolean(manifest && media);

  let disabledReason = '';
  if (!manifest && !media) {
    disabledReason = 'Isi template dan foto dulu';
  } else if (!manifest) {
    disabledReason = 'Pilih template dulu';
  } else if (!media) {
    disabledReason = 'Pilih foto atau video dulu';
  }

  const validateTemplate = (file: File) => {
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      return 'Gunakan file PNG transparan untuk template.';
    }
    return null;
  };

  const validateMedia = (file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    if (!isImage && !isVideo) {
      return 'Gunakan file foto (JPG, PNG) atau video (MP4, WebM).';
    }
    return null;
  };

  return (
    <div id="top" className="container" style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Title & Subtitle */}
      <header className="anim-hero-title" style={{ textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            backgroundColor: 'var(--sun)',
            border: '3px solid var(--ink)',
            borderRadius: 'var(--radius)',
            boxShadow: '4px 4px 0 var(--ink)',
            padding: '6px 20px',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            EDITOR TWIBBON INSTAN
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(42px, 8vw, 76px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            marginBottom: '16px',
          }}
        >
          TWEAKBON
        </h1>

        <p
          style={{
            fontSize: '18px',
            fontWeight: 600,
            maxWidth: '640px',
            margin: '0 auto',
            color: 'var(--ink)',
            opacity: 0.9,
          }}
        >
          Pasang foto atau videomu ke dalam template twibbon langsung di peramban.
        </p>
      </header>

      {/* Two Panes Row */}
      <section aria-label="Area unggah template dan media" className="anim-hero-panes">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            width: '100%',
          }}
        >
          {/* Left Pane: Template */}
          <DropPane
            title="1. Template Twibbon"
            subtitle="Tarik file PNG transparan ke sini, atau klik untuk memilih file."
            accept="image/png"
            filled={Boolean(manifest)}
            previewNode={manifest ? <TemplateThumbnail manifest={manifest} /> : undefined}
            infoText={manifest?.name}
            onSelectFile={onSelectCustomTemplate}
            onClear={onClearTemplate}
            validate={validateTemplate}
          />

          {/* Right Pane: Photo / Video */}
          <DropPane
            title="2. Foto atau Video"
            subtitle="Tarik foto atau video ke sini, atau klik untuk memilih file."
            accept="image/*,video/*"
            filled={Boolean(media)}
            previewNode={media ? <MediaThumbnail media={media} /> : undefined}
            infoText={media ? (media.kind === 'video' ? 'Video terpasang' : 'Foto terpasang') : undefined}
            onSelectFile={onSelectMediaFile}
            onClear={onClearMedia}
            validate={validateMedia}
          />
        </div>

        {/* Primary Action Button */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={!isReady}
            onClick={onProceedToEditor}
            style={{ minWidth: '220px' }}
          >
            Lanjut ke editor
          </Button>

          {disabledReason && (
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', opacity: 0.8 }}>
              {disabledReason}
            </p>
          )}
        </div>
      </section>

      {/* Shipped templates strip below panes */}
      {templates.length > 0 && (
        <section aria-label="Pilihan template siap pakai" style={{ marginTop: '8px' }}>
          <TemplatePicker
            templates={templates}
            selectedTemplateId={manifest?.id ?? null}
            onSelectTemplate={onSelectTemplate}
          />
        </section>
      )}

      {/* Three-item landing flow explanation */}
      <section aria-label="Alur kerja" className="anim-hero-steps" style={{ marginTop: '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          <div
            style={{
              border: '3px solid var(--ink)',
              borderRadius: 'var(--radius)',
              boxShadow: '4px 4px 0 var(--ink)',
              backgroundColor: 'var(--paper)',
              padding: '24px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 900,
                backgroundColor: 'var(--sun)',
                padding: '2px 8px',
                border: '2px solid var(--ink)',
                borderRadius: '2px',
              }}
            >
              LANGKAH 1
            </span>
            <h3 style={{ fontSize: '18px', margin: '12px 0 6px' }}>PILIH TEMPLATE</h3>
            <p style={{ fontSize: '14px', fontWeight: 600, opacity: 0.85, lineHeight: 1.5 }}>
              Gunakan template siap pakai dari daftar atau unggah file PNG transparan milikmu sendiri.
            </p>
          </div>

          <div
            style={{
              border: '3px solid var(--ink)',
              borderRadius: 'var(--radius)',
              boxShadow: '4px 4px 0 var(--ink)',
              backgroundColor: 'var(--paper)',
              padding: '24px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 900,
                backgroundColor: 'var(--mint)',
                padding: '2px 8px',
                border: '2px solid var(--ink)',
                borderRadius: '2px',
              }}
            >
              LANGKAH 2
            </span>
            <h3 style={{ fontSize: '18px', margin: '12px 0 6px' }}>PASANG FOTO</h3>
            <p style={{ fontSize: '14px', fontWeight: 600, opacity: 0.85, lineHeight: 1.5 }}>
              Tarik foto atau video favoritmu, lalu sesuaikan posisi dan ukurannya dengan mudah.
            </p>
          </div>

          <div
            style={{
              border: '3px solid var(--ink)',
              borderRadius: 'var(--radius)',
              boxShadow: '4px 4px 0 var(--ink)',
              backgroundColor: 'var(--paper)',
              padding: '24px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 900,
                backgroundColor: 'var(--sky)',
                padding: '2px 8px',
                border: '2px solid var(--ink)',
                borderRadius: '2px',
              }}
            >
              LANGKAH 3
            </span>
            <h3 style={{ fontSize: '18px', margin: '12px 0 6px' }}>UNDUH HASIL</h3>
            <p style={{ fontSize: '14px', fontWeight: 600, opacity: 0.85, lineHeight: 1.5 }}>
              Unduh gambar PNG jernih atau video langsung ke perangkat tanpa watermark.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="anim-hero-footer"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          paddingTop: '32px',
          paddingBottom: '24px',
          borderTop: '3px solid var(--ink)',
          marginTop: '24px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em' }}>
          TWEAKBON
        </span>
        <p style={{ fontSize: '14px', fontWeight: 700 }}>
          File diproses di perangkatmu. Tidak ada yang dikirim ke server.
        </p>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--ink)',
            textDecoration: 'underline',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Kembali ke atas
        </a>
      </footer>
    </div>
  );
}
