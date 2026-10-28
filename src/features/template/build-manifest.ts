import type { SlotRect, TemplateKind, TemplateManifest } from '../../types/template';

export interface ManifestInput {
  kind: TemplateKind;
  width: number;
  height: number;
  slot: SlotRect;
  name?: string;
}

export function buildTemplateManifest(input: ManifestInput): TemplateManifest {
  return {
    id: 'custom',
    name: input.name ?? 'Template Kustom',
    kind: input.kind,
    src: '',
    naturalWidth: input.width,
    naturalHeight: input.height,
    slot: input.slot,
    defaultFit: 'cover',
  };
}
