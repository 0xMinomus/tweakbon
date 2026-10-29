import { useRef, useEffect } from 'react';
import type { TemplateManifest } from '../types/template';
import type { UserMedia } from '../types/media';
import { DropPane } from '../components/DropPane';
import { Button } from '../components/Button';

export interface HeroProps {
  manifest: TemplateManifest | null;
  media: UserMedia | null;
  errorMessage?: string | null;
  onClearError?: () => void;
  onSelectCustomTemplate: (file: File) => void;
  onClearTemplate: () => void;
  onSelectMediaFile: (file: File) => void;
  onClearMedia: () => void;
  onProceedToEditor: () => void;
}

function MediaThumbnail({ media }: { media: UserMedia }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !media) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxDim = 140;
    const aspect = media.height > 0 ? media.width / media.height : 1;
    let w = maxDim;
    let h = maxDim;
    if (aspect >= 1) {
      h = Math.max(20, Math.round(maxDim / aspect));
    } else {
      w = Math.max(20, Math.round(maxDim * aspect));
    }

    canvas.width = w;
    canvas.height = h;

    if (media.kind === 'photo') {
      ctx.drawImage(media.source, 0, 0, w, h);
    } else {
      const video = media.source;
      const drawVideo = () => {
        ctx.drawImage(video, 0, 0, w, h);
      };
      if (video.readyState >= 2) {
        drawVideo();
      } else {
        video.addEventListener('loadeddata', drawVideo, { once: true });
        video.addEventListener('seeked', drawVideo, { once: true });
      }
    }
  }, [media]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Pratinjau media yang diunggah"
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
  const isVideo = manifest.kind === 'video';

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
      {isVideo ? (
        <video
          src={manifest.src}
          muted
          loop
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <img
          src={manifest.src}
          alt={manifest.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      )}
    </div>
  );
}

const BANNER_LABELS = [
  '100% di peramban',
  'Foto tidak diunggah',
  'Tanpa database',
  'Tanpa akun',
  'Gratis',
] as const;

/**
 * Marquee strip above the title. The track is decorative repetition, so it is
 * hidden from assistive tech; the wrapper carries the whole sentence once.
 */
function HeroBanner() {
  const marquee = [...BANNER_LABELS, ...BANNER_LABELS];

  return (
    <div
      className="hero-banner"
      role="note"
      aria-label="100% di peramban. Foto tidak diunggah ke server mana pun. Tanpa database, tanpa akun, gratis."
    >
      <div className="hero-banner-track" aria-hidden="true">
        {marquee.map((label, index) => (
          <span key={`${index}-${label}`} className="hero-banner-item">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Hero({
  manifest,
  media,
  errorMessage,
  onClearError,
  onSelectCustomTemplate,
  onClearTemplate,
  onSelectMediaFile,
  onClearMedia,
  onProceedToEditor,
}: HeroProps) {
  const isReady = Boolean(manifest && media);

  const handleSelectTemplate = (file: File) => {
    onClearError?.();
    onSelectCustomTemplate(file);
  };

  const handleClearTemplate = () => {
    onClearError?.();
    onClearTemplate();
  };

  const handleSelectMedia = (file: File) => {
    onClearError?.();
    onSelectMediaFile(file);
  };

  const handleClearMedia = () => {
    onClearError?.();
    onClearMedia();
  };

  let disabledReason = '';
  if (!manifest && !media) {
    disabledReason = 'Isi template dan foto atau video dulu';
  } else if (!manifest) {
    disabledReason = 'Pilih template dulu';
  } else if (!media) {
    disabledReason = 'Pilih foto atau video dulu';
  }

  const validateTemplate = (file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    if (!isImage && !isVideo) {
      return 'Gunakan file foto atau video untuk template.';
    }
    return null;
  };

  const validateMedia = (file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    if (!isImage && !isVideo) {
      return 'Gunakan file foto atau video.';
    }
    return null;
  };

  return (
    <div id="top" className="container" style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Title & Subtitle */}
      <HeroBanner />

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
          Pasang fotomu ke dalam template twibbon langsung di peramban.
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
            subtitle="Tarik file foto atau video template ke sini. Jika belum ada lubang transparan, latar bisa dihapus di editor."
            accept="image/png,image/*,video/*"
            filled={Boolean(manifest)}
            previewNode={manifest ? <TemplateThumbnail manifest={manifest} /> : undefined}
            infoText={manifest?.name}
            onSelectFile={handleSelectTemplate}
            onClear={handleClearTemplate}
            validate={validateTemplate}
            errorMessage={errorMessage}
          />

          {/* Right Pane: Media */}
          <DropPane
            title="2. Foto atau Video"
            subtitle="Tarik foto atau video ke sini, atau klik untuk memilih file."
            accept="image/*,video/*"
            filled={Boolean(media)}
            previewNode={media ? <MediaThumbnail media={media} /> : undefined}
            infoText={
              media
                ? media.kind === 'video'
                  ? `Video · ${Math.round(media.duration)} detik`
                  : 'Foto terpasang'
                : undefined
            }
            onSelectFile={handleSelectMedia}
            onClear={handleClearMedia}
            validate={validateMedia}
            errorMessage={errorMessage}
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

      {/* Three-item landing flow explanation */}
      <section id="alur" aria-label="Alur kerja" className="anim-hero-steps" style={{ marginTop: '16px' }}>
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
              Unggah foto atau video template. Bisa yang sudah transparan atau hapus latarnya di editor.
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
              Tarik foto favoritmu, lalu sesuaikan posisi dan ukurannya dengan mudah.
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
    </div>
  );
}
