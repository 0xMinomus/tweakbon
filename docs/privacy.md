# Privacy Architecture & Data Boundaries

Tweakbon is designed with a client-side execution model. Refer to [AGENTS.md](../AGENTS.md) for architectural invariants and system boundaries.

## What Stays on Device

All user media and processing remain strictly on the client device:

1. **Local Media Decoding**
   - User photos and videos are read via the HTML5 File API and decoded into in-memory structures (`ImageBitmap` or `HTMLVideoElement`).
   - Image orientation is handled in memory via `createImageBitmap(file, { imageOrientation: 'from-image' })`.
   - Video media is mounted directly to a local, detached `<video>` element using an in-memory object URL (`blob:` protocol).

2. **Local Compositing & Rendering**
   - Canvas operations occur entirely in local memory using HTML5 Canvas 2D contexts and `OffscreenCanvas`.
   - Transformations (translation, scaling, rotation, horizontal flip) are computed locally via pure mathematical functions.

3. **Local Export Generation**
   - Exported images are serialized directly into in-memory Blobs using `canvas.toBlob()`.
   - Motion exports are recorded locally through `HTMLCanvasElement.captureStream()` and the native `MediaRecorder` API.
   - Files are downloaded via temporary object URLs that are revoked immediately after download initiation.

At no point in this pipeline does user media pass through a remote server, external proxy, or cloud worker.

## Absence of Network Data Transmission

The application does not transmit data over the network during operation:

- **No Backend Application Services**: Tweakbon has no application server, API endpoints, or database.
- **No Third-Party Analytics**: The codebase includes no analytics libraries, session recording software, tracking pixels, or advertising SDKs.
- **No Telemetry or Error Reporting**: Errors and validation warnings are presented directly to the user in the client interface or browser developer console; no crash reports are sent across the network.
- **No Remote State Storage**: User adjustments and template selections are maintained in temporary React component state and are discarded when the tab closes.

## Boundaries & Static Asset Fetching

While user media never leaves the browser, using Tweakbon involves standard web asset requests:

1. **Static Web Application Assets**
   - Loading the application requires the browser to fetch static files (HTML, JavaScript bundles, CSS stylesheets, and template SVG vector assets) from the web server or content delivery network (CDN).
   - These requests use standard HTTP/HTTPS GET requests.

2. **Web Server Access Logs**
   - Web hosting servers and CDNs automatically log standard HTTP request metadata:
     - Client IP address
     - Request timestamp
     - User-Agent header
     - Requested asset path (e.g. `/templates/merdeka.svg`, `/assets/index.js`)
   - Server logs indicate that a client visited Tweakbon and loaded specific template assets.

3. **Distinction Between Assets and User Media**
   - Server access logs contain zero information about user media.
   - User photos, user videos, user file names, transform adjustments, and exported compositions never leave the user's browser.
