import { useRef, type ChangeEvent } from 'react';
import type { TemplateManifest } from '../types/template';
import { Button } from './Button';

export interface TemplatePickerProps {
  templates: TemplateManifest[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: TemplateManifest) => void;
  onSelectCustomFile?: (file: File) => void;
  className?: string;
}

export function TemplatePicker({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onSelectCustomFile,
  className = '',
}: TemplatePickerProps) {
  const customInputRef = useRef<HTMLInputElement>(null);

  const handleCustomClick = () => {
    customInputRef.current?.click();
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSelectCustomFile) {
      onSelectCustomFile(file);
    }
    // Reset input value so re-selecting the same file fires change
    e.target.value = '';
  };

  return (
    <div className={`template-picker-section ${className}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 900 }}>Pilihan Template</h2>

        {onSelectCustomFile && (
          <div>
            <input
              ref={customInputRef}
              type="file"
              accept="image/png"
              className="sr-only"
              onChange={handleCustomChange}
              tabIndex={-1}
            />
            <Button
              type="button"
              variant="sand"
              size="sm"
              onClick={handleCustomClick}
            >
              Pakai template sendiri
            </Button>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px',
        }}
        role="radiogroup"
        aria-label="Pilihan template twibbon"
      >
        {templates.map((tpl) => {
          const isSelected = tpl.id === selectedTemplateId;
          return (
            <button
              key={tpl.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectTemplate(tpl)}
              style={{
                border: '3px solid var(--ink)',
                borderRadius: 'var(--radius)',
                boxShadow: isSelected ? '4px 4px 0 var(--ink)' : '2px 2px 0 var(--ink)',
                backgroundColor: isSelected ? 'var(--sun)' : '#FFFFFF',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transform: isSelected ? 'translate(-2px, -2px)' : 'none',
                transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: `${tpl.naturalWidth} / ${tpl.naturalHeight}`,
                  border: '2px solid var(--ink)',
                  borderRadius: '2px',
                  backgroundColor: 'var(--paper)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={tpl.src}
                  alt={tpl.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  loading="lazy"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontWeight: 800,
                    fontSize: '14px',
                    color: 'var(--ink)',
                    textTransform: 'uppercase',
                  }}
                >
                  {tpl.name}
                </span>

                {isSelected && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 900,
                      backgroundColor: 'var(--ink)',
                      color: 'var(--paper)',
                      padding: '2px 6px',
                      borderRadius: '2px',
                    }}
                  >
                    AKTIF
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
