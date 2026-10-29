# Tweakbon

Tweakbon is a client-side web application that composites a user's photo or video into custom Twibbon template frames. The landing view features a two-pane hero: select or drop a template (photo or video, with or without transparency) on the left pane, supply personal photo or video media on the right pane, and proceed with an explicit continue action. The editor provides panning, rotation, and zooming from 50% scale (zoom-out) up to 400% before exporting.

The editor header features a template switcher to replace the active template directly, while photo adjustments and replacement remain in the control panel.

The interface uses a custom paper-plane cursor that tracks pointer position 1:1, unwraps its target angle, and interpolates rotation through `requestAnimationFrame` so 360-degree turns have no visual discontinuity. The plane stays visible over the canvas and while dragging, with `.cursor-plane-grabbing` as drag feedback, and only falls back to native cursors under `prefers-reduced-motion: reduce` or on touch devices lacking hover support.

## Editor Features

- **Chroma key video template**: Remove background color from video templates using a 32³ LUT with similarity, smoothness, and despill controls to carve out the transparent slot.
- **Photo template cutout mask**: Edit photo template cutout masks using contiguous magic wand flood fill, manual brush strokes (erase/restore), and automatic edge-color background detection to carve out the transparent slot.
- **Direct video export**: Record canvas motion and export directly to video based on user trim windows and template duration up to 30 seconds.

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

Templates are supplied by the user on the left pane. A template may be a photo (PNG, JPG) or video clip, with or without transparency:

- **Still Templates**: The app scans the alpha channel. When a transparent region is found, it derives the slot rectangle from its bounding box. When the template is opaque, it receives a full-frame slot and the user carves out the transparent slot using the cutout mask editor.
- **Video Templates**: The slot is detected once from frame 0 and held constant for the entire duration of the clip. If opaque, it receives a full-frame slot and chroma key is enabled to carve out the slot from the video background color.
- **Video codec**: Transparent formats like WebM (VP9) work directly; opaque MP4/WebM videos are also supported and keyed at runtime via chroma key.
- **Contiguity**: Stray transparent pixels are ignored; only the largest connected transparent area defines the slot when alpha is present.
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
