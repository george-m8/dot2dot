import type { AnchorSpec, Dot2DotConfig, NodeRef, NormalizedNode, NormalizedPathConfig, PathConfig, ResponsiveConfig } from './types';
import { DEFAULT_BREAKPOINTS, DEFAULT_STYLE, mergeStyle, uniqueId } from './utils';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof container === 'string') {
    const resolved = document.querySelector<HTMLElement>(container);
    if (!resolved) {
      throw new Error(`Container not found: ${container}`);
    }
    return resolved;
  }
  return container;
}

export function createOverlay(container: HTMLElement): SVGSVGElement {
  const existing = container.querySelector<SVGSVGElement>('svg.dot2dot-overlay');
  if (existing) {
    return existing;
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('dot2dot-overlay');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.overflow = 'visible';
  svg.style.pointerEvents = 'none';

  container.appendChild(svg);
  return svg;
}

export function setOverlaySize(overlay: SVGSVGElement, container: HTMLElement): void {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
  overlay.setAttribute('width', String(width));
  overlay.setAttribute('height', String(height));
}

export function normalizePaths(config: Dot2DotConfig): NormalizedPathConfig[] {
  const sourcePaths = config.autoPaths ? discoverPaths(config.container) : config.paths ?? [];

  return sourcePaths.map((path, index) => ({
    id: path.id ?? uniqueId('path', index),
    nodes: normalizeNodes(path.nodes),
    start: path.start,
    end: path.end,
    style: mergeStyle(mergeStyle(DEFAULT_STYLE, config.defaults), path.style),
    animation: path.animation,
    routeMode: path.routeMode ?? 'auto',
    visible: path.visible ?? true
  }));
}

function normalizeNodes(nodes: NodeRef[]): NormalizedNode[] {
  return nodes.map((node) => {
    if (typeof node === 'string') {
      return {
        target: node,
        anchor: 'center'
      };
    }
    return {
      target: node.target,
      anchor: node.anchor ?? 'center',
      responsive: node.responsive,
      role: node.role,
      label: node.label
    };
  });
}

function discoverPaths(containerRef: string | HTMLElement): PathConfig[] {
  const container = resolveContainer(containerRef);
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-d2d-path][data-d2d-order]'));
  const pathMap = new Map<string, Array<{ order: number; node: NodeRef }>>();

  for (const element of nodes) {
    const pathId = element.dataset.d2dPath;
    const orderText = element.dataset.d2dOrder;
    if (!pathId || !orderText) {
      continue;
    }
    const order = Number.parseInt(orderText, 10);
    if (!Number.isFinite(order)) {
      continue;
    }

    const anchor = extractAnchorFromDataset(element);

    const node: NodeRef = {
      target: element,
      anchor,
      responsive: extractResponsiveAnchorOverrides(element)
    };

    if (!pathMap.has(pathId)) {
      pathMap.set(pathId, []);
    }
    pathMap.get(pathId)?.push({ order, node });
  }

  const paths: PathConfig[] = [];
  for (const [id, entries] of pathMap) {
    const sorted = [...entries].sort((a, b) => a.order - b.order).map((entry) => entry.node);
    paths.push({ id, nodes: sorted });
  }

  return paths;
}

function extractAnchorFromDataset(element: HTMLElement): AnchorSpec {
  const x = element.dataset.d2dAnchorX;
  const y = element.dataset.d2dAnchorY;
  if (x || y) {
    return {
      x: x ?? '50%',
      y: y ?? '50%'
    };
  }
  return 'center';
}

function extractResponsiveAnchorOverrides(element: HTMLElement): NormalizedNode['responsive'] {
  const responsive: Record<string, { anchor: AnchorSpec }> = {};

  for (const [key, value] of Object.entries(element.dataset)) {
    if (!key.startsWith('d2dAnchor') || key === 'd2dAnchorX' || key === 'd2dAnchorY' || !value) {
      continue;
    }

    const match = key.match(/^d2dAnchor([A-Z][a-zA-Z0-9]*)X$/);
    if (!match) {
      continue;
    }

    const breakpoint = lowerFirst(match[1]);
    const yKey = `d2dAnchor${match[1]}Y` as keyof DOMStringMap;
    const y = element.dataset[yKey as string];

    responsive[breakpoint] = {
      anchor: {
        x: value,
        y: y ?? '50%'
      }
    };
  }

  return Object.keys(responsive).length > 0 ? responsive : undefined;
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function getActiveBreakpoint(container: HTMLElement, responsive?: ResponsiveConfig): string | null {
  if (!responsive) {
    return null;
  }
  if (responsive.active && responsive.active !== 'auto') {
    return responsive.active;
  }

  const breakpoints = responsive.breakpoints ?? DEFAULT_BREAKPOINTS;
  const targetWidth = responsive.mode === 'container' ? container.clientWidth : window.innerWidth;

  for (const [name, range] of Object.entries(breakpoints)) {
    const minOk = range.min == null || targetWidth >= range.min;
    const maxOk = range.max == null || targetWidth <= range.max;
    if (minOk && maxOk) {
      return name;
    }
  }

  return null;
}
