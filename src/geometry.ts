import type { AnchorSpec, EndpointConfig, NormalizedNode, ResolvedPoint } from './types';
import { normalizeAnchor, parseUnit } from './utils';

export type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Point = { x: number; y: number };

export function resolveNodePoint(
  container: HTMLElement,
  node: NormalizedNode,
  activeBreakpoint: string | null
): ResolvedPoint | null {
  const override = activeBreakpoint ? node.responsive?.[activeBreakpoint] : undefined;
  if (override?.hidden) {
    return null;
  }

  const targetRef = override?.target ?? node.target;
  const target = resolveTarget(targetRef);
  if (!target) {
    return null;
  }

  const anchor = override?.anchor ?? node.anchor;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const anchorObj = normalizeAnchor(anchor as AnchorSpec);

  const x = targetRect.left - containerRect.left + parseUnit(anchorObj.x, targetRect.width, rootFontSize);
  const y = targetRect.top - containerRect.top + parseUnit(anchorObj.y, targetRect.height, rootFontSize);

  return { x, y, target, label: node.label };
}

function resolveTarget(target: string | HTMLElement): HTMLElement | null {
  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target);
  }
  return target;
}

export function buildPolyline(points: Point[], routeMode: 'hv' | 'vh' | 'auto' | 'straight'): Point[] {
  if (points.length < 2) {
    return points;
  }

  if (routeMode === 'straight') {
    return points;
  }

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];

    const mode = routeMode === 'auto' ? chooseAutoMode(prev, next) : routeMode;
    const mid = mode === 'hv' ? { x: next.x, y: prev.y } : { x: prev.x, y: next.y };

    if (!(mid.x === prev.x && mid.y === prev.y) && !(mid.x === next.x && mid.y === next.y)) {
      result.push(mid);
    }
    result.push(next);
  }

  return dedupeCollinear(result);
}

function chooseAutoMode(a: Point, b: Point): 'hv' | 'vh' {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return dx >= dy ? 'hv' : 'vh';
}

function dedupeCollinear(points: Point[]): Point[] {
  if (points.length < 3) {
    return points;
  }

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = result[result.length - 1];
    const current = points[i];
    const next = points[i + 1];

    const collinearX = prev.x === current.x && current.x === next.x;
    const collinearY = prev.y === current.y && current.y === next.y;

    if (!collinearX && !collinearY) {
      result.push(current);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

export function buildRoundedPath(points: Point[], radius: number): string {
  if (points.length === 0) {
    return '';
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  if (radius <= 0 || points.length < 3) {
    return toStraightPath(points);
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const inVec = { x: curr.x - prev.x, y: curr.y - prev.y };
    const outVec = { x: next.x - curr.x, y: next.y - curr.y };

    const inLen = Math.hypot(inVec.x, inVec.y);
    const outLen = Math.hypot(outVec.x, outVec.y);

    if (inLen === 0 || outLen === 0) {
      continue;
    }

    const r = Math.min(radius, inLen / 2, outLen / 2);

    const p1 = {
      x: curr.x - (inVec.x / inLen) * r,
      y: curr.y - (inVec.y / inLen) * r
    };
    const p2 = {
      x: curr.x + (outVec.x / outLen) * r,
      y: curr.y + (outVec.y / outLen) * r
    };

    d += ` L ${p1.x} ${p1.y}`;
    d += ` Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

function toStraightPath(points: Point[]): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

export function applyEndpointExtension(
  points: Point[],
  endpoint: EndpointConfig | undefined,
  side: 'start' | 'end',
  container: HTMLElement,
  rootFontSize: number
): Point[] {
  if (!endpoint?.extend || endpoint.extend.mode === 'none' || points.length < 2) {
    return points;
  }

  const containerRect = container.getBoundingClientRect();
  const first = points[0];
  const last = points[points.length - 1];

  const extendPoint = side === 'start' ? first : last;
  const newPoint = { ...extendPoint };

  switch (endpoint.extend.mode) {
    case 'to-container-top':
      newPoint.y = 0;
      break;
    case 'to-container-bottom':
      newPoint.y = containerRect.height;
      break;
    case 'to-container-left':
      newPoint.x = 0;
      break;
    case 'to-container-right':
      newPoint.x = containerRect.width;
      break;
    case 'to-page-top':
      newPoint.y = -containerRect.top;
      break;
    case 'to-page-bottom':
      newPoint.y = window.innerHeight - containerRect.top;
      break;
    case 'to-page-left':
      newPoint.x = -containerRect.left;
      break;
    case 'to-page-right':
      newPoint.x = window.innerWidth - containerRect.left;
      break;
    case 'by-distance': {
      const distance = parseUnit(endpoint.extend.distance, side === 'start' ? 1 : 1, rootFontSize);
      if (side === 'start') {
        const toward = points[1];
        const dx = extendPoint.x - toward.x;
        const dy = extendPoint.y - toward.y;
        const len = Math.hypot(dx, dy) || 1;
        newPoint.x = extendPoint.x + (dx / len) * distance;
        newPoint.y = extendPoint.y + (dy / len) * distance;
      } else {
        const toward = points[points.length - 2];
        const dx = extendPoint.x - toward.x;
        const dy = extendPoint.y - toward.y;
        const len = Math.hypot(dx, dy) || 1;
        newPoint.x = extendPoint.x + (dx / len) * distance;
        newPoint.y = extendPoint.y + (dy / len) * distance;
      }
      break;
    }
    default:
      return points;
  }

  return side === 'start' ? [newPoint, ...points] : [...points, newPoint];
}
