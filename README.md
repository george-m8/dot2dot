# Dot2Dot.js

Container-relative SVG routing library for drawing styled connector paths between ordered anchor points.

## Features

- SVG overlay rendering (crisp and styleable)
- Ordered node routing with `straight`, `hv`, `vh`, and `auto` route modes
- Rounded orthogonal corners via configurable radius
- Node anchors via presets, freeform strings, or `{ x, y }`
- Optional responsive node overrides by breakpoint (`mobile`, `tablet`, `desktop`, etc.)
- Start/end extension and endpoint caps (`circle`, `square`, `arrow`)
- Optional draw animation
- Optional auto-discovery using `data-d2d-*` attributes

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

Outputs:

- `dist/dot2dot.esm.js`
- `dist/dot2dot.umd.js`
- `dist/types.d.ts`

## Debug Mode

You can enable debug in config:

```js
new Dot2Dot({
  container: '.dot2dot-container',
  debug: true,
  paths: [...]
});
```

Or force debug from URL query params (useful in Webflow/production checks):

- `?dot2dot-debug=true` enables debug
- `?dot2dot-debug=false` disables debug

When enabled, debug shows:

- container bounds overlay
- anchor dots
- point labels (`pathId:index` if no label is provided)
- breakpoint changes in console warnings

## Quick Start (Module)

```ts
import Dot2Dot from './dist/dot2dot.esm.js';

const d2d = new Dot2Dot({
  container: '.dot2dot-container',
  paths: [
    {
      id: 'hero-path',
      nodes: [
        { target: '#start', anchor: 'center' },
        {
          target: '#guide-a',
          anchor: { x: '100%', y: '50%' },
          responsive: {
            mobile: { anchor: 'center top 100%' }
          }
        },
        { target: '#end', anchor: 'left 0 top 50%' }
      ],
      routeMode: 'auto',
      style: {
        stroke: '#222',
        width: 4,
        radius: 18,
        zIndex: 3,
        opacity: 1
      },
      animation: {
        type: 'draw',
        duration: 900
      }
    }
  ],
  responsive: {
    mode: 'viewport',
    active: 'auto',
    breakpoints: {
      mobile: { max: 767 },
      desktop: { min: 1024 }
    }
  },
  observeResize: true,
  debug: false
});
```

## Quick Start (Script Tag / Webflow)

Use the UMD build so `window.Dot2Dot` is available.

```html
<script src="https://YOUR-NETLIFY-SITE.netlify.app/dot2dot.umd.js"></script>
<script>
  const d2d = new Dot2Dot({
    container: '.dot2dot-container',
    paths: [
      {
        id: 'main',
        nodes: [
          { target: '#node-1', anchor: 'center' },
          { target: '#node-2', anchor: 'left 25% top 50%' },
          { target: '#node-3', anchor: 'center' }
        ],
        style: { stroke: '#111', width: 4, radius: 16 }
      }
    ],
    responsive: {
      breakpoints: {
        mobile: { max: 767 },
        desktop: { min: 1024 }
      }
    }
  });
</script>
```

## Auto Discovery with Data Attributes

```html
<div class="dot2dot-container">
  <div data-d2d-path="main" data-d2d-order="1"></div>
  <div
    data-d2d-path="main"
    data-d2d-order="2"
    data-d2d-anchor-x="25%"
    data-d2d-anchor-y="50%"
    data-d2d-anchor-mobile-x="50%"
    data-d2d-anchor-mobile-y="100%"
  ></div>
  <div data-d2d-path="main" data-d2d-order="3"></div>
</div>

<script>
  const d2d = Dot2Dot.init({
    container: '.dot2dot-container',
    autoPaths: true,
    responsive: {
      breakpoints: {
        mobile: { max: 767 },
        desktop: { min: 1024 }
      }
    }
  });
</script>
```

## API

### Constructor / Init

- `new Dot2Dot(config)`
- `Dot2Dot.init(config)`

### Instance methods

- `redraw()`
- `destroy()`
- `addPath(pathConfig)`
- `removePath(pathId)`
- `showPath(pathId)`
- `hidePath(pathId)`

## Netlify + Webflow Workflow

1. Build locally: `npm run build`
2. Deploy this repo to Netlify (or drag-and-drop deploy)
3. Ensure `dist/dot2dot.umd.js` is publicly reachable
4. In Webflow Project Settings -> Custom Code (or page embed), include script URL
5. Add your init script after the UMD script tag

### Netlify UI Setup (exact values)

When creating the Netlify site from Git:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20` (already in `netlify.toml`)

After first deploy, your files are typically available at:

- `https://YOUR-SITE.netlify.app/dot2dot.umd.js`
- `https://YOUR-SITE.netlify.app/dot2dot.esm.js`

You can verify by opening those URLs directly in a browser.

### Webflow Embed Pattern

```html
<script src="https://YOUR-SITE.netlify.app/dot2dot.umd.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Dot2Dot.init({
      container: '.dot2dot-container',
      paths: [
        {
          id: 'main',
          nodes: ['#node-1', '#node-2', '#node-3'],
          style: { stroke: '#111', width: 4, radius: 16 }
        }
      ]
    });
  });
</script>
```

Place this in Webflow page-level custom code (before `</body>`) or an Embed element after the target DOM exists.

### Versioned Asset Strategy (recommended)

To avoid breaking existing Webflow pages when you ship updates, keep a versioned copy of assets in Netlify.

Example URLs:

- `https://YOUR-SITE.netlify.app/v0.1.0/dot2dot.umd.js`
- `https://YOUR-SITE.netlify.app/v0.1.0/dot2dot.esm.js`
- `https://YOUR-SITE.netlify.app/v0.1.0/dot2dot.umd.js.map`
- `https://YOUR-SITE.netlify.app/v0.1.0/dot2dot.esm.js.map`

Recommended release flow:

1. Build: `npm run build`
2. Run one of:
  - `npm run release:version -- 0.1.0`
  - `npm run release:patch` (uses `package.json` version)
3. Deploy to Netlify
4. Keep old version folders for live Webflow pages
5. Point new Webflow projects/pages to the new version URL only when ready

Quick local example:

```bash
npm run build
npm run release:version -- 0.1.0
# or
npm run release:patch
```

This gives you safe, predictable upgrades while preserving backward compatibility for published pages.

## Notes

- Ensure your container has `position: relative` (library sets it if needed).
- If node targets are missing at runtime, that path is skipped.
- Keep `debug: true` during setup to inspect anchors and labels.
