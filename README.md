# Tweakbon

Tweakbon is a client-side web application that composites a user's photo into custom Twibbon template frames. The landing view features a two-pane hero: select or drop a template (PNG with transparency or video) on the left pane, supply personal photo media on the right pane, and proceed with an explicit continue action. The editor provides panning, rotation, and zooming from 50% scale (zoom-out) up to 400% before exporting.

The editor header features a template switcher to replace the active template directly, while photo adjustments and replacement remain in the control panel.

The interface uses a custom paper-plane cursor that tracks pointer position 1:1, unwraps its target angle, and interpolates rotation through `requestAnimationFrame` so 360-degree turns have no visual discontinuity. It falls back to native cursors under `prefers-reduced-motion: reduce`, on touch devices lacking hover support, and over the interactive canvas stage.

Refer to [AGENTS.md](./AGENTS.md) for architecture rules, code conventions, and development guidelines.

## Privacy Model

All media processing executes directly on the client device. Photos and videos are decoded into local memory via browser APIs (`createImageBitmap`, HTML `<video>`, and Canvas 2D). No user media is transmitted to a remote server. The application contains no analytics, telemetry, tracking pixels, or remote state storage. Network traffic is limited to fetching static web application assets. Full details are documented in [docs/privacy.md](./docs/privacy.md).

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

## Custom Templates

Templates are supplied by the user on the left pane. A template may be a transparent PNG or a video clip:

- **Still Templates**: The app scans the alpha channel, identifies the largest contiguous transparent region, and derives the slot rectangle from its bounding box.
- **Video Templates**: The slot is detected once from frame 0 and held constant for the entire duration of the clip. The transparent region in the video must not move relative to the frame; otherwise the slot mask drifts away from the stationary photo beneath.
- **Contiguity**: Stray transparent pixels are ignored; only the largest connected transparent area defines the slot.
- **Geometry**: Non-rectangular transparent cutouts are approximated by their axis-aligned bounding box.

## Repository Structure

```
src/
  app/            Page shell, two-pane hero, and editor session state
  features/
    editor/       Transform state, gesture handling, and slot clamping
    template/     Manifest parsing, schema validation, and slot detection
    media/        Decoding, bitmap cache, and object URL lifecycle
    render/       Canvas 2D compositor and layer ordering
    export/       Still image and video encoding
  components/     Presentational UI components and custom cursor
  styles/         Design tokens, base styles, animations
  types/          Contract interfaces for editor, media, and template
tests/            Vitest integration tests
docs/             Architecture and privacy specifications
```

Architectural layers and data flow are documented in [docs/architecture.md](./docs/architecture.md).

## Browser Requirements

Tweakbon requires an evergreen browser supporting:
- Canvas 2D rendering context
- `createImageBitmap` with orientation support
- `OffscreenCanvas`
- `MediaRecorder` and `HTMLCanvasElement.captureStream` (for motion export)
