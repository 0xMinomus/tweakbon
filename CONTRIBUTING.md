# Contributing to Tweakbon

Thanks for taking the time to improve this. Tweakbon is a small, deliberately narrow tool —
the fastest way to get a change merged is to keep it inside that scope.

## Before you start

- Read [`AGENTS.md`](AGENTS.md). It is the engineering contract for this repository:
  folder ownership, purity rules, resource lifetime, naming, and testing expectations.
- [`docs/architecture.md`](docs/architecture.md) explains the coordinate spaces and the
  compositing order. Most renderer bugs come from ignoring one of the two.
- For anything larger than a bug fix, open an issue first so the approach can be agreed on
  before you write code.

## Development setup

```bash
npm install
npm run dev
```

Node 22 LTS or newer. There is no backend, no environment file, and no service to start.

## The four gates

Every change must pass all four before review:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Add or update tests when you change pure logic — transform math, slot detection, manifest
parsing, chroma classification, mask operations. Do not assert canvas pixels in `jsdom`;
verify rendering by running the app instead.

## Code conventions

The full list lives in `AGENTS.md`. The short version:

- TypeScript strict. No `any`, no `@ts-ignore`, no non-null assertions in new code.
- Named exports only, except where a tool requires a default export.
- Geometry, clamping, and parsing stay pure functions under `src/features/*`; anything that
  needs `document` belongs to `components/` or `features/media/`.
- Large objects (`ImageBitmap`, `HTMLVideoElement`, canvases) never enter React state — use
  refs and release them explicitly. Every `createImageBitmap` gets a `close()`, every
  `createObjectURL` gets a `revokeObjectURL`, every `requestAnimationFrame` gets a
  `cancelAnimationFrame`.
- Errors are values at trust boundaries: file loading returns a discriminated result, because
  a malformed user file is normal input, not an exception.
- New dependency? Explain why the platform cannot do it in the pull request.

## Commit messages

Conventional Commits, imperative mood, subject under 72 characters:

```
feat(render): key the template layer instead of the media
fix(cursor): keep the plane visible while dragging a slider
docs: describe the opaque-template path
```

## Pull requests

A pull request is ready when:

- [ ] The change does one thing, and the description says what and why.
- [ ] All four gates pass locally.
- [ ] Tests cover the behaviour that could plausibly regress.
- [ ] The app was run and the changed path exercised by hand, with the result mentioned in the
      description (screenshot or a short recording for anything visual).
- [ ] Documentation that the change falsifies is updated in the same pull request.
- [ ] No leftover `TODO`, placeholder, stub, debug log, or commented-out code.

Please avoid unrelated reformatting; it makes review harder than the feature itself.

## Reporting bugs

Use the issue template. The most useful report includes: browser and version, the file type
that triggered it (PNG, JPEG, MP4, …), what you expected, what happened, and whether the
console shows an error. If the problem involves your media, a synthetic reproduction is worth
more than the real file.

## Security

Do not report vulnerabilities in a public issue. See [`SECURITY.md`](SECURITY.md).
