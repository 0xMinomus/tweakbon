# Tweakbon

Tweakbon is a client-side web application that composites user photos or videos into Twibbon template frames. Users select a template, supply their media, adjust placement with drag, zoom, and rotation controls, and export the composite file.

Refer to [AGENTS.md](./AGENTS.md) for architecture rules, code conventions, and development guidelines.

## Privacy Model

All media processing executes directly on the client device. Photos and videos are decoded into local memory via browser APIs (`createImageBitmap`, HTML `<video>`, and Canvas 2D). No user media is transmitted to a remote server. The application contains no analytics, telemetry, tracking pixels, or remote state storage. Network traffic is limited to fetching static web application assets and public template SVGs. Full details are documented in [docs/privacy.md](./docs/privacy.md).

## Development Commands

All commands match `package.json`:

```bash
npm run dev          # Start Vite development server
npm run build        # Typecheck and build production bundle
npm run preview      # Preview production build locally
npm run typecheck    # Run TypeScript compiler checks without emitting
npm run lint         # Run ESLint across codebase
npm test             # Run Vitest test suite once
npm run test:watch   # Run Vitest in watch mode
```

Run template catalog validation:

```bash
node scripts/validate-templates.mjs
```

## Adding a Template

Templates are declarative assets stored under `public/templates/`. Adding a template does not require modifying application source code:

1. Create an SVG template frame. The root `<svg>` element must declare explicit `width` and `height` attributes matching its intrinsic pixel dimensions.
2. Cut out the transparent slot using a single `<path>` element with `fill-rule="evenodd"` that combines the outer frame perimeter with the inner cutout. Do not use SVG masks or fill opacity.
3. Save the SVG file to `public/templates/<id>.svg`.
4. Add the manifest entry to `public/templates/index.json`:

```json
{
  "id": "merdeka",
  "name": "Merdeka",
  "kind": "image",
  "src": "/templates/merdeka.svg",
  "naturalWidth": 1080,
  "naturalHeight": 1350,
  "slot": {
    "x": 0.125,
    "y": 0.12,
    "width": 0.75,
    "height": 0.7
  },
  "defaultFit": "cover"
}
```

Manifest fields:
- `id`: Stable identifier matching the asset file stem.
- `name`: Display name shown in template selection.
- `kind`: Media kind, either `"image"` or `"video"`.
- `src`: Absolute path under `public/`.
- `naturalWidth`, `naturalHeight`: Positive integer pixel dimensions matching SVG attributes.
- `slot`: Normalized coordinates (`x`, `y`, `width`, `height` in range `0..1`).
- `slotPolygon`: Optional array of at least 3 normalized points for non-rectangular holes.
- `defaultFit`: Optional initial fit mode (`"cover"` or `"contain"`).

5. Validate the template catalog:

```bash
node scripts/validate-templates.mjs
```

Detailed authoring requirements are in [docs/templates.md](./docs/templates.md).

## Repository Structure

```
src/
  app/            Page shell, view switching, and editor session state
  features/
    editor/       Transform state, gesture handling, and slot clamping
    template/     Manifest parsing, schema validation, and slot detection
    media/        Decoding, bitmap cache, and object URL lifecycle
    render/       Canvas 2D compositor and layer ordering
    export/       Still image and video encoding
  components/     Presentational UI components
  lib/            Pure math and geometry helpers
  types/          Contract interfaces for editor, media, and template
public/
  templates/      Template SVG assets and index.json catalog
scripts/          Validation scripts
tests/            Vitest catalog verification and integration tests
docs/             Architecture, template authoring, and privacy specifications
```

Architectural layers and data flow are documented in [docs/architecture.md](./docs/architecture.md).

## Browser Requirements

Tweakbon requires an evergreen browser supporting:
- Canvas 2D rendering context
- `createImageBitmap` with orientation support
- `OffscreenCanvas`
- `MediaRecorder` and `HTMLCanvasElement.captureStream` (for motion export)
