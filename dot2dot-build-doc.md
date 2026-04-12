# Dot2Dot.js Build Document

## Overview

Dot2Dot.js is a small JavaScript library that draws styled connector lines across a webpage by following a sequence of user-defined nodes.

The library should let a developer:

- mark elements on the page as path nodes
- define one or more line paths
- choose how each line starts and ends
- control styling such as width, radius, colour, z-index, opacity and animation
- use either dedicated invisible guide elements or existing page elements as anchors
- place anchors at element-relative positions such as `left 25% / top 50%`
- support multiple independent paths on the same page

The goal is to keep authoring simple while still being flexible enough for landing pages, timelines, product tours, scroll storytelling and decorative routed lines.

---

## Core Design Goals

1. **Simple to author**
   - A developer should be able to add classes or data attributes to HTML and initialise the library with a short script.

2. **Works with existing layout**
   - Lines should be drawn from already-positioned elements without forcing major HTML changes.

3. **Supports guide-only nodes**
   - Invisible guide divs should be allowed for shaping the path.

4. **Multiple paths**
   - Several separate line systems should be able to coexist on one page.

5. **Responsive**
   - Lines should recalculate on resize, font load, content shift and optional scroll updates.

6. **Predictable**
   - The API should avoid overly “magic” class parsing where possible.

7. **Progressively enhanced**
   - If JavaScript fails, the page still works.

---

## Recommended Approach

Use **SVG overlay rendering**, not canvas.

### Why SVG
SVG is the best fit because:

- rounded corners are easier to generate and style
- z-index layering is simpler with one absolutely-positioned overlay
- strokes, dash animations, gradients, fades and end caps are straightforward
- paths remain crisp on high DPI screens
- debugging is easier in dev tools

### Rendering Model
The library should create one SVG overlay per container:

```html
<div class="dot2dot-container">
  <!-- existing content -->
  <svg class="dot2dot-overlay" aria-hidden="true"></svg>
</div>
```

The overlay should be:

- absolutely positioned
- inset to the container bounds
- `pointer-events: none`
- sized to the container’s rendered box

The library then converts node coordinates into SVG path commands.

---

## Suggested Public API

### Basic initialisation

```js
Dot2Dot.init({
  container: '.dot2dot-container',
  paths: [
    {
      id: 'main-line',
      nodes: ['#node-1', '#node-2', '#node-3'],
      style: {
        stroke: '#111',
        width: 4,
        radius: 24,
        zIndex: 2
      }
    }
  ]
});
```

### Recommended API shape

```js
Dot2Dot.init({
  container: string | HTMLElement,
  paths: PathConfig[],
  defaults?: GlobalStyleConfig,
  responsive?: ResponsiveConfig,
  observeResize?: boolean,
  observeMutations?: boolean,
  redrawOnScroll?: boolean,
  debug?: boolean
});
```

---

## Mobile Responsiveness Strategy (Recommended)

Your suggested direction is strong: keep a single canonical path definition, then allow **optional breakpoint overrides** for the nodes that need different anchors/targets on smaller or larger layouts.

### Why this route is best

- avoids duplicating entire path configs for mobile and desktop
- keeps defaults simple for most nodes
- only overrides nodes that actually shift in responsive layouts
- works with both JS config and declarative `data-*` markup
- preserves the existing recommendation to avoid heavy class-name grammar parsing

### Recommended config model

Use an optional `responsive` block in `init`:

```ts
type ResponsiveConfig = {
  mode?: 'viewport' | 'container';
  active?: 'auto' | string;
  breakpoints?: {
    [key: string]: {
      min?: number;
      max?: number;
    };
  };
  debounceMs?: number;
};
```

Suggested default breakpoints:

```js
responsive: {
  mode: 'viewport',
  active: 'auto',
  breakpoints: {
    mobile: { max: 767 },
    tablet: { min: 768, max: 1023 },
    desktop: { min: 1024 }
  },
  debounceMs: 60
}
```

### Node-level override model

Keep `anchor` as the base value, then allow optional per-breakpoint overrides:

```js
{
  target: '#hero-card',
  anchor: 'right 100% top 50%',
  responsive: {
    mobile: { anchor: 'center top 100%' },
    desktop: { anchor: 'right 100% top 50%' }
  }
}
```

### Resolution order

1. Resolve active breakpoint (`auto` from viewport/container width)
2. For each node, apply `responsive[active]` if present
3. Fall back to base node settings
4. Redraw only if active breakpoint changed or measured geometry changed

This gives predictable behaviour and avoids unnecessary redraw churn.

---

## PathConfig

```ts
type PathConfig = {
  id?: string;
  nodes: NodeRef[];
  start?: EndpointConfig;
  end?: EndpointConfig;
  style?: PathStyleConfig;
  animation?: AnimationConfig;
  visible?: boolean;
};
```

### Notes
- `nodes` is the ordered route.
- The line should flow from the first resolved point to the last.
- `start` and `end` control decorations or extension behaviour beyond the first and last node.

---

## NodeRef

Keep node targeting flexible but not too clever.

```ts
type NodeRef =
  | string
  | {
      target: string | HTMLElement;
      anchor?: AnchorSpec;
      responsive?: {
        [breakpoint: string]: {
          target?: string | HTMLElement;
          anchor?: AnchorSpec;
          hidden?: boolean;
        };
      };
      role?: 'waypoint' | 'start' | 'end';
      label?: string;
    };
```

### String form
The string form should support selectors:

```js
nodes: ['#node-1', '.node-2', '[data-dot2dot-node="3"]']
```

### Object form
The object form should allow explicit anchor control:

```js
nodes: [
  { target: '#hero', anchor: 'left 25% top 50%' },
  { target: '#guide-1', anchor: 'center' },
  { target: '#cta', anchor: 'right 100% top 20px' }
]
```

Responsive override example:

```js
nodes: [
  {
    target: '#feature',
    anchor: 'left 50% top 100%',
    responsive: {
      mobile: { anchor: 'center top 100%' },
      desktop: { anchor: 'left 50% top 100%' }
    }
  }
]
```

---

## Strong Recommendation on HTML Markup

Use **data attributes** as the main documented method.  
Allow classes and IDs too, but do not make complex class parsing the main API.

### Preferred markup

```html
<div data-dot2dot-node="node-1"></div>
<div data-dot2dot-node="node-2"></div>
<div data-dot2dot-node="node-3"></div>
```

Then configure:

```js
nodes: [
  '[data-dot2dot-node="node-1"]',
  '[data-dot2dot-node="node-2"]',
  '[data-dot2dot-node="node-3"]'
]
```

### Why this is better than encoded classes
A class like:

```css
.dot2dot-node-1-left-25per-top-50per
```

looks convenient at first, but becomes hard to maintain because:

- parsing is brittle
- units become messy
- refactoring is harder
- class names become extremely long
- mixing multiple anchors on one element becomes awkward

Instead, support anchor metadata through either config or concise data attributes.

---

## Recommended Node Anchor Syntax

Each node needs an anchor point inside its target element.

### Supported presets

- `center`
- `top`
- `right`
- `bottom`
- `left`
- `top-left`
- `top-right`
- `bottom-left`
- `bottom-right`

### Supported freeform syntax

```txt
left 25% top 50%
left 40px top 1.5rem
center top 100%
right 0 top 50%
```

### Internal parsing target

```ts
type AnchorSpec =
  | string
  | {
      x: string | number;
      y: string | number;
    };
```

### Resolution rules

Resolve anchor positions relative to the element’s box:

- `%` is relative to the element’s width or height
- `px`, `rem`, `em`, `vw`, `vh` may be supported
- raw numbers default to `px`

Example:

```js
{ target: '#banner', anchor: { x: '25%', y: '50%' } }
```

---

## Multiple Anchor Points on One Element

This is a real requirement and should be first-class.

A single element may need to serve as multiple route points.

### Good solution
Allow the same target element to be referenced multiple times with different anchors:

```js
nodes: [
  { target: '#wide-strip', anchor: { x: '0%', y: '50%' } },
  { target: '#wide-strip', anchor: { x: '100%', y: '50%' } }
]
```

This is cleaner than requiring multiple classes on the same element.

### Optional aliasing
Allow a label to make debugging easier:

```js
nodes: [
  { target: '#wide-strip', anchor: { x: '0%', y: '50%' }, label: 'strip-start' },
  { target: '#wide-strip', anchor: { x: '100%', y: '50%' }, label: 'strip-end' }
]
```

---

## Start and End Behaviour

The start and end of a line should be configurable independently.

```ts
type EndpointConfig = {
  extend?: EndpointExtendConfig;
  cap?: EndpointCapConfig;
  fade?: FadeConfig | boolean;
};
```

### Extend options
These allow the path to begin or finish outside the first/last node.

```ts
type EndpointExtendConfig = {
  mode:
    | 'none'
    | 'to-container-top'
    | 'to-container-bottom'
    | 'to-container-left'
    | 'to-container-right'
    | 'to-page-top'
    | 'to-page-bottom'
    | 'to-page-left'
    | 'to-page-right'
    | 'by-distance';
  distance?: number | string;
};
```

### Cap options

```ts
type EndpointCapConfig = {
  type?: 'none' | 'circle' | 'square' | 'arrow';
  size?: number;
  filled?: boolean;
};
```

### Fade options

```ts
type FadeConfig = {
  length?: number | string;
  opacityFrom?: number;
  opacityTo?: number;
};
```

### Example

```js
start: {
  extend: { mode: 'to-container-top' },
  cap: { type: 'circle', size: 10, filled: true },
  fade: { length: 40, opacityFrom: 0, opacityTo: 1 }
},
end: {
  cap: { type: 'arrow', size: 12 },
  fade: true
}
```

---

## Path Style Options

```ts
type PathStyleConfig = {
  stroke?: string;
  width?: number;
  radius?: number;
  opacity?: number;
  zIndex?: number;
  dashArray?: string | number[];
  dashOffset?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  blendMode?: string;
  className?: string;
};
```

### Minimum supported options for v1
- `stroke`
- `width`
- `radius`
- `zIndex`
- `opacity`

Everything else can be progressive enhancement.

---

## Routing Rules

The path should run through nodes in order.

### Default route style
Use orthogonal routing:
- horizontal and vertical segments only
- corners rounded by the configured radius

This fits the user’s idea best and is easier to reason about than bezier curves.

### Basic algorithm
For each pair of adjacent nodes:

1. Resolve point A
2. Resolve point B
3. Determine whether to go:
   - horizontal then vertical, or
   - vertical then horizontal
4. Apply corner rounding at direction changes
5. Merge consecutive collinear segments where possible

### Route mode option

```ts
type RouteMode = 'hv' | 'vh' | 'auto' | 'straight';
```

### Recommendation
For v1, support:

- `straight`
- `hv`
- `vh`
- `auto`

Where `auto` picks the cleaner route based on delta and previous segment direction.

---

## Guide Nodes vs Real Content Nodes

Both should be supported equally.

### Guide node examples

```html
<div class="d2d-guide" aria-hidden="true"></div>
```

Use CSS for placement:

```css
.d2d-guide {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
```

### Existing content node example

```html
<section id="feature-card"></section>
```

Then:

```js
{ target: '#feature-card', anchor: 'left 50% top 100%' }
```

The library should not care whether the target is visible content or a guide-only element.

---

## Container Strategy

Every path should render relative to a container.

### Recommended behaviour
- all node coordinates are measured relative to the container
- overlay SVG is attached to the container
- line clipping stays inside that container unless explicitly configured otherwise

### Why
This avoids page-level complexity and makes scroll handling much easier.

### Future enhancement
Allow page-level overlays later, but do not make that the default.

---

## CSS Contract

Suggested generated classes:

```css
.dot2dot-container {
  position: relative;
}

.dot2dot-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.dot2dot-path {
  fill: none;
}
```

Optional debug classes:

```css
.dot2dot-debug-node {}
.dot2dot-debug-label {}
```

---

## Proposed HTML Conventions

### Option A: config-driven only
Developer selects existing elements entirely through JS.

### Option B: light data attributes
Recommended for most users.

```html
<div data-dot2dot-path="main" data-dot2dot-node="1"></div>
<div data-dot2dot-path="main" data-dot2dot-node="2"></div>
<div data-dot2dot-path="main" data-dot2dot-node="3"></div>
```

Then initialise with minimal JS:

```js
Dot2Dot.init({
  container: '.dot2dot-container',
  autoPaths: true
});
```

### Recommendation
Support both, but document **config-driven** as the most powerful and reliable option.

---

## Suggested Auto Discovery Format

If auto discovery is implemented, use explicit attributes rather than class parsing.

### Example

```html
<div data-d2d-path="main" data-d2d-order="1"></div>
<div data-d2d-path="main" data-d2d-order="2"></div>
<div data-d2d-path="main" data-d2d-order="3"></div>
```

Optional anchor overrides:

```html
<div
  data-d2d-path="main"
  data-d2d-order="2"
  data-d2d-anchor-x="25%"
  data-d2d-anchor-y="50%"
></div>
```

Optional responsive anchor overrides:

```html
<div
  data-d2d-path="main"
  data-d2d-order="2"
  data-d2d-anchor-x="25%"
  data-d2d-anchor-y="50%"
  data-d2d-anchor-mobile-x="50%"
  data-d2d-anchor-mobile-y="100%"
></div>
```

Optional responsive utility classes (thin convenience layer only):

```html
<div class="d2d-mobile-alt-anchor" data-d2d-path="main" data-d2d-order="2"></div>
```

If class-based responsive helpers are supported, keep them as simple flags and map them to documented override presets. Do not parse full coordinate grammar from class names.

### Why this is better
It is easier to parse, validate and debug than encoding everything into class names.

---

## Animation

Animation should be optional.

### v1 animation support
Support a simple “draw in” effect using stroke dash properties.

```ts
type AnimationConfig = {
  type?: 'none' | 'draw';
  duration?: number;
  delay?: number;
  easing?: string;
};
```

### Example

```js
animation: {
  type: 'draw',
  duration: 1200,
  easing: 'ease-out'
}
```

### Future options
- fade in
- path reveal on scroll
- segment-by-segment reveal

---

## Events and Public Methods

### Public methods

```ts
Dot2Dot.init(config)
Dot2Dot.redraw()
Dot2Dot.destroy()
Dot2Dot.addPath(pathConfig)
Dot2Dot.removePath(pathId)
Dot2Dot.showPath(pathId)
Dot2Dot.hidePath(pathId)
```

### Optional instance-based API
This may be cleaner than a singleton:

```js
const d2d = new Dot2Dot({
  container: '.dot2dot-container',
  paths: [...]
});

d2d.redraw();
d2d.destroy();
```

### Recommendation
Use the instance API internally, and optionally expose `Dot2Dot.init()` as a convenience wrapper.

---

## Internal Architecture

Suggested modules:

```txt
/core
  Dot2Dot.ts
/config
  normalizeConfig.ts
/dom
  resolveElement.ts
  measureNode.ts
/geometry
  resolveAnchor.ts
  buildSegments.ts
  roundCorners.ts
  pathToSvg.ts
/render
  createOverlay.ts
  renderPath.ts
/observe
  resizeObserver.ts
  mutationObserver.ts
/utils
  units.ts
  debug.ts
```

---

## Coordinate Resolution

Each node becomes a resolved point:

```ts
type ResolvedPoint = {
  x: number;
  y: number;
  target: HTMLElement;
  label?: string;
};
```

### Measurement steps

1. Get container rect
2. Get target rect
3. Resolve anchor within target rect
4. Convert to container-relative coordinates
5. Store for routing

### Important
Use `getBoundingClientRect()` for measurement.

---

## Reflow and Redraw Triggers

The line should update when layout changes.

### v1 recommended triggers
- `ResizeObserver` on the container
- window resize
- active breakpoint change
- optional manual `redraw()`

### v2 optional triggers
- `MutationObserver`
- font load completion
- scroll updates
- image load completion

### Advice
Do not auto-watch everything by default if it harms performance.

---

## Debug Mode

This will help a lot during development.

### Debug mode should show
- anchor dots
- node labels
- segment outlines or point markers
- container bounds

### Example

```js
Dot2Dot.init({
  ...config,
  debug: true
});
```

---

## Validation Rules

At init time, validate:

- container exists
- each node target resolves to exactly one element, or a documented first match rule is applied
- each path has at least 2 nodes
- units are valid where supplied
- radius does not exceed segment constraints
- duplicate path IDs are rejected

Return helpful warnings in development mode.

---

## Error Handling Strategy

Use non-fatal warnings where possible.

### Example warnings
- target selector not found
- target selector matched multiple elements
- unsupported unit in anchor
- path skipped because fewer than 2 valid nodes resolved

Only throw for severe configuration errors.

---

## Performance Guidance

### For v1
Optimise for clarity over extreme performance.

Still do the following:
- batch DOM reads before DOM writes
- reuse SVG elements on redraw where possible
- debounce redraws on resize
- avoid full re-init when only a single path changes

### Likely scale target
A reasonable v1 target is:
- 1 to 20 paths
- 2 to 30 nodes per path

That is more than enough for typical marketing and editorial pages.

---

## Suggested Developer Experience

### Easiest usage

```html
<div class="dot2dot-container">
  <div id="node-1"></div>
  <div id="node-2"></div>
  <div id="node-3"></div>
</div>

<script>
  const d2d = new Dot2Dot({
    container: '.dot2dot-container',
    paths: [
      {
        id: 'main',
        nodes: [
          { target: '#node-1', anchor: 'center' },
          { target: '#node-2', anchor: { x: '25%', y: '50%' } },
          { target: '#node-3', anchor: 'center' }
        ],
        start: {
          extend: { mode: 'to-container-top' },
          cap: { type: 'circle', size: 10, filled: true }
        },
        end: {
          cap: { type: 'arrow', size: 12 }
        },
        style: {
          stroke: '#000',
          width: 6,
          radius: 18,
          zIndex: 5
        },
        animation: {
          type: 'draw',
          duration: 1000
        }
      }
    ]
  });
</script>
```

---

## What to Avoid

### Avoid making class parsing the main control system
This:

```html
<div class="dot2dot-node-1-left-25per-top-50per"></div>
```

should only exist, if at all, as a thin convenience layer.

### Reasons
- too hard to validate
- too hard to extend
- awkward when using multiple anchors on one element
- hard to support mixed units cleanly
- difficult for teams to maintain

A data-attribute or JS-object approach is much more robust.

---

## Sensible v1 Scope

### Include
- SVG overlay
- container-relative rendering
- explicit ordered nodes
- anchor presets and custom x/y anchors
- optional breakpoint-aware anchor/target overrides
- rounded orthogonal routing
- line width / colour / opacity / z-index / radius
- start/end extension
- start/end caps
- simple draw animation
- resize redraw
- debug mode

### Leave for later
- obstacle avoidance
- smart collision routing
- scroll-bound progress animation
- gradients along whole path
- path editing UI
- automatic class-string grammar parsing
- connector labels
- plugin ecosystem

---

## Proposed TypeScript Definitions

```ts
type UnitValue = number | string;

type AnchorObject = {
  x: UnitValue;
  y: UnitValue;
};

type AnchorSpec =
  | 'center'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | string
  | AnchorObject;

type ResponsiveNodeOverride = {
  target?: string | HTMLElement;
  anchor?: AnchorSpec;
  hidden?: boolean;
};

type ResponsiveConfig = {
  mode?: 'viewport' | 'container';
  active?: 'auto' | string;
  breakpoints?: {
    [key: string]: {
      min?: number;
      max?: number;
    };
  };
  debounceMs?: number;
};

type NodeRef =
  | string
  | {
      target: string | HTMLElement;
      anchor?: AnchorSpec;
      responsive?: {
        [breakpoint: string]: ResponsiveNodeOverride;
      };
      role?: 'waypoint' | 'start' | 'end';
      label?: string;
    };

type EndpointExtendMode =
  | 'none'
  | 'to-container-top'
  | 'to-container-bottom'
  | 'to-container-left'
  | 'to-container-right'
  | 'to-page-top'
  | 'to-page-bottom'
  | 'to-page-left'
  | 'to-page-right'
  | 'by-distance';

type EndpointConfig = {
  extend?: {
    mode: EndpointExtendMode;
    distance?: UnitValue;
  };
  cap?: {
    type?: 'none' | 'circle' | 'square' | 'arrow';
    size?: number;
    filled?: boolean;
  };
  fade?: boolean | {
    length?: UnitValue;
    opacityFrom?: number;
    opacityTo?: number;
  };
};

type PathStyleConfig = {
  stroke?: string;
  width?: number;
  radius?: number;
  opacity?: number;
  zIndex?: number;
  dashArray?: string | number[];
  dashOffset?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  blendMode?: string;
  className?: string;
};

type AnimationConfig = {
  type?: 'none' | 'draw';
  duration?: number;
  delay?: number;
  easing?: string;
};

type PathConfig = {
  id?: string;
  nodes: NodeRef[];
  start?: EndpointConfig;
  end?: EndpointConfig;
  style?: PathStyleConfig;
  animation?: AnimationConfig;
  routeMode?: 'hv' | 'vh' | 'auto' | 'straight';
  visible?: boolean;
};

type Dot2DotConfig = {
  container: string | HTMLElement;
  paths: PathConfig[];
  defaults?: PathStyleConfig;
  responsive?: ResponsiveConfig;
  observeResize?: boolean;
  observeMutations?: boolean;
  redrawOnScroll?: boolean;
  debug?: boolean;
};
```

---

## Suggested Milestones

### Milestone 1
- create overlay
- resolve node coordinates
- draw straight SVG polyline/path

### Milestone 2
- support orthogonal segments
- add rounded corners
- add style config

### Milestone 3
- support custom anchors
- start/end caps
- container extensions

### Milestone 4
- resize redraw
- breakpoint detection and responsive node overrides
- debug mode
- validation

### Milestone 5
- simple animation
- auto discovery via data attributes
- packaging and docs

---

## Packaging Recommendation

Ship as:

- ESM build
- UMD build for simple script-tag usage
- TypeScript types

### Example output
- `dist/dot2dot.esm.js`
- `dist/dot2dot.umd.js`
- `dist/types.d.ts`

---

## Documentation Recommendations

The actual library docs should include:

1. quick start
2. config reference
3. anchor syntax
4. start/end examples
5. guide node examples
6. debug mode
7. responsive redraw notes
8. common patterns:
   - timeline path
   - page-spanning decorative path
   - connecting cards
   - using one element with multiple anchors

---

## Final Recommendation

Your original idea is good, but it becomes much stronger if you shift the main design away from encoded class names and toward:

- **selectors or data attributes for node targeting**
- **JS config objects for styling and routing**
- **optional data attributes for lightweight declarative markup**
- **SVG overlay rendering**

### Best simple mental model
Think of the library as:

> “A container-relative SVG router that connects ordered anchor points on page elements.”

That gives you a simple, stable foundation that can grow later without boxing you into awkward class-name syntax.

---

## Example MVP Spec

```js
new Dot2Dot({
  container: '.section',
  paths: [
    {
      id: 'hero-path',
      nodes: [
        {
          target: '#start',
          anchor: 'center',
          responsive: {
            mobile: { anchor: 'center top 100%' }
          }
        },
        { target: '#guide-a', anchor: 'center' },
        { target: '#guide-b', anchor: { x: '100%', y: '50%' } },
        { target: '#end', anchor: 'left 0 top 50%' }
      ],
      start: {
        extend: { mode: 'to-container-top' },
        cap: { type: 'circle', size: 10, filled: true }
      },
      end: {
        cap: { type: 'arrow', size: 12 }
      },
      style: {
        stroke: '#222',
        width: 4,
        radius: 20,
        zIndex: 3,
        opacity: 1
      },
      routeMode: 'auto',
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

---

## Build Summary

### Main choices
- render with SVG
- use container-relative coordinates
- use ordered node arrays
- use anchors rather than encoded class grammar
- use optional breakpoint overrides for mobile/desktop anchor shifts
- support both content nodes and invisible guide nodes
- let one element provide multiple anchor points
- make class parsing optional, not core

### Result
This keeps the library simple enough to build, pleasant to use, and flexible enough for real-world layouts.
