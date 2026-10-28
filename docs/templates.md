# Template Authoring Guide

Templates in Tweakbon are declarative assets stored under `public/templates/`. Adding or editing a template requires no TypeScript modifications. Refer to [AGENTS.md](../AGENTS.md) for architectural invariants and project guidelines.

## SVG Asset Requirements

Template artwork must adhere to these technical constraints:

1. **Explicit Dimensions**
   - The root `<svg>` element must declare explicit numeric `width` and `height` attributes:
     ```xml
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
     ```
   - These attributes must match the `naturalWidth` and `naturalHeight` declared in the template manifest.

2. **Self-Contained Vector Data**
   - Zero external dependencies: no external raster images (`<image xlink:href="http...">`), linked external stylesheets, or remote web fonts.
   - All typography should be converted to vector paths or use standard system fallback font stacks.

3. **Deterministic Rendering**
   - Assets must render reliably when loaded into client-side `ImageBitmap` contexts via `createImageBitmap(blob)`.

## Transparent Hole Technique: EvenOdd Paths

The transparent slot where user media displays must be created using vector geometry, not raster transparency or SVG masking:

- **Required Method**: A single `<path>` element with `fill-rule="evenodd"` combining the outer frame perimeter and the inner hole boundary.
- **Prohibited Methods**: Do not use SVG `<mask>`, `<clipPath>`, or `fill-opacity` tricks to create the transparent slot.

### Example EvenOdd Path

In an SVG with canvas dimensions 1080×1350 and a centered cutout from (135, 162) to (945, 1107):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <!-- Single path defining outer rectangle and inner cutout -->
  <path
    fill="#FFFAF0"
    fill-rule="evenodd"
    d="
      M 0 0
      L 1080 0
      L 1080 1350
      L 0 1350
      Z
      M 135 162
      L 945 162
      L 945 1107
      L 135 1107
      Z
    "
  />
  <!-- Decorative border elements around the frame -->
  <rect x="0" y="0" width="1080" height="1350" fill="none" stroke="#000000" stroke-width="12" />
</svg>
```

When rendered, the region inside the inner path coordinates remains completely transparent, revealing the underlying user media during canvas composition.

## Manifest Schema Reference

Every template must be registered in `public/templates/index.json`. The catalog structure:

```json
{
  "templates": [
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
  ]
}
```

### Schema Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier slug. Must match the filename stem of `src`. |
| `name` | `string` | Yes | Human-readable label displayed in the UI template picker. |
| `kind` | `'image' \| 'video'` | Yes | Asset medium. Use `'image'` for SVG/raster templates, `'video'` for motion frames. |
| `src` | `string` | Yes | Absolute URL path from web root, e.g. `"/templates/merdeka.svg"`. |
| `naturalWidth` | `number` | Yes | Positive integer width in pixels. Must match SVG `width` attribute. |
| `naturalHeight` | `number` | Yes | Positive integer height in pixels. Must match SVG `height` attribute. |
| `slot` | `SlotRect` | Yes | Normalized slot coordinates `{ x, y, width, height }`. |
| `slotPolygon` | `Point[]` | No | Optional array of at least 3 normalized points `{ x, y }` for non-rectangular holes. |
| `defaultFit` | `'cover' \| 'contain'` | No | Initial scale mode when media loads. Defaults to `'cover'`. |

## Normalized Slot Convention

Slot coordinates are normalized to fractions of the template's intrinsic dimensions:

$$\text{slot.x} = \frac{\text{slotPixelX}}{\text{naturalWidth}}$$

$$\text{slot.y} = \frac{\text{slotPixelY}}{\text{naturalHeight}}$$

$$\text{slot.width} = \frac{\text{slotPixelWidth}}{\text{naturalWidth}}$$

$$\text{slot.height} = \frac{\text{slotPixelHeight}}{\text{naturalHeight}}$$

### Validation Bounds

Normalized values must strictly satisfy:
- $0 \le \text{slot.x} \le 1$
- $0 \le \text{slot.y} \le 1$
- $\text{slot.width} > 0$
- $\text{slot.height} > 0$
- $\text{slot.x} + \text{slot.width} \le 1$
- $\text{slot.y} + \text{slot.height} \le 1$

A tolerance of $\pm 10^{-4}$ is allowed for floating-point rounding.

## Catalog Validation Command

To verify that template SVGs, manifest fields, and normalized slot geometry align correctly:

```bash
node scripts/validate-templates.mjs
```

### Exit Behavior

- **Exit 0**: All templates pass validation. Prints confirmation:
  ```
  ok: 3 templates
  ```
- **Exit 1**: Validation errors detected. Prints each failure on a single line formatted as `file: problem`:
  ```
  public/templates/kelas.svg: file does not exist
  public/templates/index.json: template "wisuda" file stem "custom" in src "/templates/custom.svg" does not match id "wisuda"
  ```
