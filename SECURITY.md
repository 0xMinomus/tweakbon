# Security Policy

## Scope

Tweakbon is a static client-side application. It has no server, no backend API, no database,
no user accounts, and no credentials to steal. Everything it processes stays inside the tab,
and the built bundle makes no outbound requests of its own.

That narrows the realistic security surface to:

- **File parsing in the browser.** A malicious image or video is decoded by the browser's own
  decoders and then by our canvas and mask code. Memory-exhaustion inputs (huge pixel
  dimensions, absurd frame counts) are the main risk.
- **The supply chain.** Anything that runs at build time — Vite, TypeScript, ESLint, Vitest,
  the React toolchain — and the lockfile that pins them.
- **Data exposure through a bad change.** A contribution that quietly adds analytics, a remote
  fetch, or local persistence would break the product's core promise. That is treated as a
  security issue, not a style issue.

Out of scope: vulnerabilities in your browser or operating system, and anything introduced by
a third-party fork or a self-hosted deployment that adds its own infrastructure.

## Reporting a vulnerability

Please **do not** open a public issue.

- Use GitHub's private reporting: **Security → Report a vulnerability** on this repository.
- If that is unavailable, open a minimal issue that asks for a private channel, without
  details.

Include the affected version or commit, browser and version, a reproduction (a synthetic file
beats a personal one), the impact you believe it has, and any mitigation you already see.

Expect an initial response within a few days. Once the report is confirmed, a fix and a
coordinated disclosure date will be arranged with you; credit is given unless you ask
otherwise.

## Supported versions

The project is pre-1.0 and ships from `master`. Fixes land on `master`; there are no
maintained release branches yet.

## Verification you can do yourself

Because the privacy claim is central, it is designed to be checked:

1. Open DevTools → **Network**, clear the list.
2. Load a template and your own photo or video.
3. Edit, then export a PNG and an MP4.

No request should carry a user file. The repository contains no `fetch`, `XMLHttpRequest`,
`FormData`, `WebSocket`, cookie, `localStorage`, `sessionStorage`, or IndexedDB usage in
`src/`.

## Hardening notes for self-hosters

- Serve the bundle over HTTPS.
- If you add logging, analytics, or a CDN, update `README.md`, `docs/privacy.md`, and this file
  in the same change — the promise is part of the product.
- Keep dependencies pinned through `package-lock.json` and review lockfile diffs.
