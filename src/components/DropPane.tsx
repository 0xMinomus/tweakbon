import { useState, useRef, type DragEvent, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './Button';

export interface DropPaneProps {
  title: string;
  subtitle: string;
  accept: string;
  filled: boolean;
  previewNode?: ReactNode;
  infoText?: string;
  onSelectFile: (file: File) => void;
  onClear?: () => void;
  validate?: (file: File) => string | null;
  errorMessage?: string | null;
  className?: string;
}

export function DropPane({
  title,
  subtitle,
  accept,
  filled,
  previewNode,
  infoText,
  onSelectFile,
  onClear,
  validate,
  errorMessage: externalError,
  className = '',
}: DropPaneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayError = internalError || externalError;

  const handleFile = (file: File) => {
    if (validate) {
      const err = validate(file);
      if (err) {
        setInternalError(err);
        return;
      }
    }
    setInternalError(null);
    onSelectFile(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  };

  return (
    <div
      className={`hero-pane drop-pane ${isDragging ? 'drop-pane-active' : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={!filled ? handleClick : undefined}
      onKeyDown={!filled ? handleKeyDown : undefined}
      role={!filled ? 'button' : undefined}
      tabIndex={!filled ? 0 : undefined}
      aria-label={`${title}. ${subtitle}`}
      style={{
        minHeight: '280px',
        border: '3px solid var(--ink)',
        borderRadius: 'var(--radius)',
        boxShadow: isDragging ? '6px 6px 0 var(--ink)' : '4px 4px 0 var(--ink)',
        backgroundColor: isDragging ? 'var(--sky)' : filled ? 'var(--paper)' : '#FFFFFF',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        cursor: !filled ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleInputChange}
        tabIndex={-1}
      />

      {filled ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
          {previewNode}

          {infoText && (
            <p
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--ink)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {infoText}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              type="button"
              variant="sky"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Ganti
            </Button>

            {onClear && (
              <Button
                type="button"
                variant="sand"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setInternalError(null);
                  onClear();
                }}
              >
                Hapus
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              border: '3px solid var(--ink)',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--sun)',
              boxShadow: '2px 2px 0 var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2.5"
              strokeLinecap="square"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <p
            style={{
              fontSize: '18px',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </p>

          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', opacity: 0.8, maxWidth: '280px' }}>
            {subtitle}
          </p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Pilih file
          </Button>
        </div>
      )}

      {displayError && (
        <div
          role="alert"
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: 'var(--sand)',
            border: '2px solid var(--ink)',
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          {displayError}
        </div>
      )}
    </div>
  );
}
