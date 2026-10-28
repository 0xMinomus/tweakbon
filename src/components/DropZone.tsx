import { useState, useRef, type DragEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button } from './Button';

export interface DropZoneProps {
  onSelectFile: (file: File) => void;
  className?: string;
}

export function DropZone({ onSelectFile, className = '' }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setErrorMessage('Format file tidak didukung. Gunakan file foto (JPG, PNG) atau video (MP4, WebM).');
      return;
    }

    setErrorMessage(null);
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
    // Only deactivate if leaving the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
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
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
  };

  return (
    <div className={`dropzone-wrapper ${className}`}>
      <div
        className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Tarik foto atau video ke sini, atau klik untuk pilih file"
        style={{
          border: '3px solid var(--ink)',
          borderRadius: 'var(--radius)',
          boxShadow: isDragging ? '6px 6px 0 var(--ink)' : '4px 4px 0 var(--ink)',
          backgroundColor: isDragging ? 'var(--sky)' : '#FFFFFF',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'transform 120ms ease, background-color 120ms ease, box-shadow 120ms ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={handleInputChange}
          tabIndex={-1}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              border: '3px solid var(--ink)',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--sun)',
              boxShadow: '3px 3px 0 var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2.5"
              strokeLinecap="square"
            >
              <rect x="3" y="3" width="18" height="18" rx="0" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="var(--ink)" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>

          <div>
            <p
              style={{
                fontSize: '22px',
                fontWeight: 900,
                color: 'var(--ink)',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
                marginBottom: '6px',
              }}
            >
              Tarik foto atau video ke sini
            </p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', opacity: 0.8 }}>
              atau klik untuk pilih file
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Pilih file media
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: 'var(--sand)',
            border: '3px solid var(--ink)',
            borderRadius: 'var(--radius)',
            boxShadow: '3px 3px 0 var(--ink)',
            fontWeight: 700,
            fontSize: '14px',
            color: 'var(--ink)',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
