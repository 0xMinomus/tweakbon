# Repository Guidelines

Tweakbon is a browser tool that puts a person's photo or video into a Twibbon template. The user supplies a template (photo or video) with a transparent region (the "slot"), supplies their own media, then pans, zooms, and rotates that media until it sits correctly inside the slot. A template may also arrive fully opaque: the user carves the slot out of the template itself, with chroma key for a video template and background removal for a photo template. Image and video templates follow the same flow.

> **Status: working.** The hero-to-editor-to-download flow is implemented and verified in Chromium: photo and video media, PNG and MP4 export, three shipped templates, and a custom PNG template path. No backend. Tests, lint, typecheck and build are green.

## Project Overview

- One job: composite user media into a transparent slot of a template, then export.
- Audience is non-technical. The editor must open, auto-fit, and be adjustable in one gesture each.
- Templates come from the user. The slot is found by scanning the alpha channel of the uploaded file; an opaque template gets the full frame as its slot.
- Scope discipline: the editor, the compositor, and export. No accounts, no social features, no server-rendered preview.

## Architecture & Data Flow

Three layers, strictly separated:

1. **Domain (pure TypeScript).** Geometry, transforms, clamping, template manifest parsing. No DOM, no React, no canvas. Fully unit-testable.
2. **Rendering.** Canvas 2D compositor that turns state into pixels.
3. **UI (React).** Loads inputs, drives gestures, displays the canvas. Holds no geometry of its own.

### Coordinate spaces

| Space | Unit | Where used |
|---|---|---|
| Slot space | normalized `0..1` of the slot rectangle | editor state, gestures, persisted user settings |
| Template space | template natural pixels | only inside the renderer and exporter |
| Display space | CSS pixels × `devicePixelRatio` | canvas element sizing only |

Editor state stores the media transform **relative to the slot**, never relative to the template. Moving or resizing the hole in a template must not invalidate a saved adjustment.

### Compositing order

```
canvas
 ├─ draw user media, transformed into slot space, clipped to slot bounds
 └─ draw template on top (its transparent area reveals the media)
```

The template is the top layer. That is why the slot must be transparent: the alpha channel is the composition mask. When the uploaded template carries no alpha of its own, the hole is created on the template at runtime — chroma key for a video template, a cutout mask for a photo template — and the user's media is never keyed or masked. Never punch a hole with `globalCompositeOperation` when the template already carries alpha; likewise never draw the media over the template.

### Data flow

```
template file ──► manifest (slot geometry, natural size, kind) ──┐
                                                                  ├──► editor state ──► compositor ──► <canvas>
user media ──► decode to ImageBitmap | HTMLVideoElement ──────────┘                          └──► export encoder
```

1. Template load: decode the template frame and detect the slot from its alpha. A template with no transparent region is valid, not an error: it receives the full-frame slot and the user carves the hole with the template's own chroma key or cutout mask. Video templates do not require a manifest.
2. Media load: `createImageBitmap` for photos, a muted looping `<video>` for user videos. Keep both out of React state.
3. Auto-fit: scale media to cover the slot, center it, clamp rotation to 0.
4. Interaction: drag to translate, pinch/wheel to scale, optional rotate. Clamp so the slot never shows background.
5. Render on change, coalesced through `requestAnimationFrame`. One render per frame, never per event.
6. Export: re-render at template natural resolution into an offscreen canvas, then encode.

## Key Directories

```
src/
  app/            view switch, hero, editor, session hook
  features/
    template/     manifest schema, index loader, slot detection
    media/        decoding, object URL lifecycle
    editor/       transform state, clamping, cover math
    render/       compositor, layer order, slot clipping
    export/       PNG still, MP4/WebM motion
  components/     shared presentational UI
  styles/         design tokens, base styles, animations
  types/          shared contracts (template, media, transform)
tests/            integration checks
docs/             architecture, template authoring, privacy
```

Feature-first. A module belongs to the feature that owns the behavior it implements; shared code moves to `components/` only after a second consumer exists. `src/lib/` does not exist yet — do not create it for a single helper.

## Development Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # tsc --noEmit && vite build
npm run preview      # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm test             # Vitest, single run
npm run test:watch   # Vitest, watch
```

`typecheck`, `lint`, `test`, and `build` must all pass before a change is considered done. If a script is missing, add it rather than documenting a manual equivalent.

## Code Conventions & Common Patterns

- **TypeScript strict.** No `any`, no `@ts-ignore` without an adjacent reason, no non-null assertions in new code. Prefer `unknown` plus a narrowing guard at trust boundaries.
- **Files** `kebab-case.ts` / `kebab-case.tsx`. **Components and types** `PascalCase`. **Functions and variables** `camelCase`. **Hooks** `useThing`.
- **Named exports everywhere.** No default exports except where a tool requires them.
- **Purity.** Geometry, clamping, and manifest parsing live in `features/*/` as plain functions with no React and no DOM. If a function needs `document`, it belongs to `components/` or `media/`.
- **State.** Local React state first. `useReducer` when transitions are named and ordered. No global store until two unrelated features need the same data; then a single context, not a library.
- **Large objects stay outside React.** `ImageBitmap`, `HTMLVideoElement`, and canvases live in refs or a module-level cache. React state holds only serializable descriptors (ids, transforms, flags).
- **Resource lifetime is explicit.** Every `createImageBitmap` has a `close()`, every `URL.createObjectURL` has a `revokeObjectURL`, every `requestAnimationFrame` has a `cancelAnimationFrame`. Cleanup lives in the `useEffect` return or an owner object.
- **Async.** No floating promises: `await`, or `void fn().catch(handler)`. Cancellation via `AbortSignal` on loaders. A component that unmounts must not write to state afterward.
- **Errors.** Loading and parsing return a discriminated result (`{ ok: true, value } | { ok: false, error }`) because bad user files are normal input. Throw only for programmer errors. User-facing failures are one plain sentence plus a recovery action.
- **Units and naming.** Normalized `0..1` values carry an explicit name: `slotRect`, `offset`, `scale`. Pixel values carry `Px`. No unit conversion hidden inside a getter.
- **Dependencies.** Add one only when the platform cannot do it. Canvas 2D, `createImageBitmap`, and `URL` cover the image path; reach for a library only for video encoding, where the browser still lacks a portable path.
- **Accessibility.** The canvas needs an accessible name and a text description of the current placement. Every gesture needs a keyboard equivalent and a reset control.

## Important Files

| Path | Role |
|---|---|
| `index.html` | Vite entry document |
| `vite.config.ts` | build config, test config |
| `tsconfig.json` | strict compiler settings |
| `eslint.config.js` | flat config, TypeScript rules |
| `src/main.tsx` | React root |
| `src/app/App.tsx` | view switch (`hero` \| `editor`), template index load |
| `src/app/useEditorSession.ts` | glue: owns media, template, transform, loading and error state |
| `src/app/Hero.tsx` | title, drop zone, template strip, privacy line |
| `src/features/editor/transform.ts` | transform reducer, scale clamp, cover math, offset clamping |
| `src/features/template/manifest.ts` | manifest parse/validate, index loader |
| `src/features/template/slot-detect.ts` | alpha bounding-box detection for custom templates |
| `src/features/media/load.ts` | image/video decode, template fetch, idempotent `release()` |
| `src/features/render/compositor.ts` | draw order, slot clipping, transform application, template keying/cutout |
| `src/features/render/keying.ts` | chroma-key a video template frame onto the canvas |
| `src/features/render/masking.ts` | `bakeMaskedTemplate`: apply the template's cutout mask with `destination-in` |
| `src/features/export/export.ts` | offscreen still render, MediaRecorder motion export |
| `src/components/CanvasStage.tsx` | DPR canvas, pointer/pinch/keyboard input, rAF loop |
| `src/types/template.ts` | `TemplateManifest`, `SlotRect`, `Point` |
| `src/types/media.ts` | `UserMedia`, `TemplateImage`, `TemplateSource` |
| `src/types/editor.ts` | `TransformState`, `DrawSize` |

A template manifest is the contract. Fields: `id`, `name`, `kind` (`image` | `video`), `src`, `naturalWidth`, `naturalHeight`, `slot` (`x`, `y`, `width`, `height` in normalized units), optional `slotPolygon` for non-rectangular holes, optional `defaultFit`. Manifests are built at runtime from the user's file; there is no shipped catalog.

## Runtime & Tooling Preferences

- **Runtime:** Node 22 LTS or newer. Package manager: **npm** (ships with Node, no extra install step).
- **Bundler:** Vite. **UI:** React with TypeScript. **Rendering:** Canvas 2D; WebGL only if profiling proves it necessary.
- **Browsers:** evergreen Chromium, Firefox, Safari. `createImageBitmap` and `OffscreenCanvas` are required, not optional. No legacy support.
- **No SSR.** This is a client-side app; nothing renders on a server, and no code may assume a server runtime.
- Pin dependency versions in `package.json` once the scaffold exists, and commit the lockfile.

## Testing & QA

- **Unit:** Vitest. Coverage focuses on pure logic: transform math, clamping, manifest parsing, slot detection. These carry the correctness risk; UI does not.
- **Components:** React Testing Library when a component has branching behavior. No snapshot tests.
- **Canvas:** do not assert pixels in jsdom. Test the functions that produce draw instructions, then verify the real output by running the app.
- **Manual smoke, required for any renderer or exporter change:** load a template, load a photo, drag to each clamp edge, zoom to both limits, export, open the exported file and confirm the slot reveals the media at the exported resolution.
- **Video invitations:** verify with a loop longer than 30 seconds and confirm the exported duration matches the source.
- Test files are colocated: `compositor.test.ts` beside `compositor.ts`, or under `__tests__/` in the same feature directory.
- Deterministic tests only: no network, no timers you cannot control, no reliance on file system state.

## Working Agreements for AI Assistants

- Read this file before editing.
- Prefer editing existing modules over adding new ones. Do not introduce an abstraction with a single implementation.
- Never leave `TODO`, placeholder, or stub implementations in a delivered change.
- Never claim a canvas behavior was verified without running the app.
- If a change alters the manifest schema or coordinate convention, update `src/types/template.ts`, `manifest.ts`, and the sample templates in the same change.
