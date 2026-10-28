import type { TemplateManifest } from '../types/template';
import { DropZone } from '../components/DropZone';
import { TemplatePicker } from '../components/TemplatePicker';

export interface HeroProps {
  templates: TemplateManifest[];
  selectedTemplate: TemplateManifest | null;
  onSelectTemplate: (template: TemplateManifest) => void;
  onSelectCustomTemplate?: (file: File) => void;
  onSelectMediaFile: (file: File) => void;
}

export function Hero({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onSelectCustomTemplate,
  onSelectMediaFile,
}: HeroProps) {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Title & Subtitle */}
      <header style={{ textAlign: 'center' }}>
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
            maxWidth: '600px',
            margin: '0 auto',
            color: 'var(--ink)',
            opacity: 0.9,
          }}
        >
          Pasang foto atau videomu ke dalam template twibbon langsung di peramban.
        </p>
      </header>

      {/* Drop zone immediately after title */}
      <section aria-label="Unggah media">
        <DropZone onSelectFile={onSelectMediaFile} />
      </section>

      {/* Template picker strip */}
      {templates.length > 0 && (
        <section aria-label="Pilih template">
          <TemplatePicker
            templates={templates}
            selectedTemplateId={selectedTemplate?.id ?? null}
            onSelectTemplate={onSelectTemplate}
            onSelectCustomFile={onSelectCustomTemplate}
          />
        </section>
      )}

      {/* One-line privacy note */}
      <footer style={{ textAlign: 'center' }}>
        <p
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 700,
            backgroundColor: 'var(--paper)',
            padding: '8px 16px',
            border: '2px solid var(--ink)',
            borderRadius: 'var(--radius)',
            boxShadow: '2px 2px 0 var(--ink)',
          }}
        >
          File diproses di perangkatmu. Tidak ada yang dikirim ke server.
        </p>
      </footer>
    </div>
  );
}
