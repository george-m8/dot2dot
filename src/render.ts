import type { EndpointConfig, NormalizedPathConfig, ResolvedPoint } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

type DrawResult = {
  path: SVGPathElement;
};

export function clearOverlay(overlay: SVGSVGElement): void {
  overlay.replaceChildren();
}

export function drawPath(
  overlay: SVGSVGElement,
  config: NormalizedPathConfig,
  d: string,
  points: ResolvedPoint[]
): DrawResult {
  const path = document.createElementNS(SVG_NS, 'path');
  path.classList.add('dot2dot-path');
  if (config.style.className) {
    path.classList.add(config.style.className);
  }

  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', config.style.stroke ?? '#111');
  path.setAttribute('stroke-width', String(config.style.width ?? 4));
  path.setAttribute('stroke-opacity', String(config.style.opacity ?? 1));
  path.setAttribute('stroke-linecap', config.style.lineCap ?? 'round');
  path.setAttribute('stroke-linejoin', config.style.lineJoin ?? 'round');

  if (config.style.dashArray) {
    path.setAttribute(
      'stroke-dasharray',
      Array.isArray(config.style.dashArray) ? config.style.dashArray.join(' ') : config.style.dashArray
    );
  }
  if (config.style.dashOffset != null) {
    path.setAttribute('stroke-dashoffset', String(config.style.dashOffset));
  }
  if (config.style.blendMode) {
    path.style.mixBlendMode = config.style.blendMode;
  }

  const zIndex = config.style.zIndex ?? 1;
  path.style.setProperty('--dot2dot-z-index', String(zIndex));
  path.style.zIndex = String(zIndex);

  overlay.appendChild(path);

  if (config.animation?.type === 'draw') {
    animateDraw(path, config.animation.duration ?? 1000, config.animation.delay ?? 0, config.animation.easing ?? 'ease-out');
  }

  drawEndpointCap(overlay, config.start, points[0], config.style.stroke ?? '#111', config.style.width ?? 4);
  drawEndpointCap(overlay, config.end, points[points.length - 1], config.style.stroke ?? '#111', config.style.width ?? 4);

  return { path };
}

function animateDraw(path: SVGPathElement, duration: number, delay: number, easing: string): void {
  const length = path.getTotalLength();
  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);
  path.style.transition = `stroke-dashoffset ${duration}ms ${easing} ${delay}ms`;

  requestAnimationFrame(() => {
    path.style.strokeDashoffset = '0';
  });
}

function drawEndpointCap(
  overlay: SVGSVGElement,
  endpoint: EndpointConfig | undefined,
  point: ResolvedPoint | undefined,
  stroke: string,
  width: number
): void {
  if (!endpoint?.cap || !point) {
    return;
  }

  const type = endpoint.cap.type ?? 'none';
  if (type === 'none') {
    return;
  }

  const size = endpoint.cap.size ?? Math.max(6, width * 2);
  const filled = endpoint.cap.filled ?? true;

  if (type === 'circle') {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', String(size / 2));
    circle.setAttribute('stroke', stroke);
    circle.setAttribute('fill', filled ? stroke : 'transparent');
    circle.setAttribute('stroke-width', String(Math.max(1, width / 2)));
    overlay.appendChild(circle);
    return;
  }

  if (type === 'square') {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(point.x - size / 2));
    rect.setAttribute('y', String(point.y - size / 2));
    rect.setAttribute('width', String(size));
    rect.setAttribute('height', String(size));
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('fill', filled ? stroke : 'transparent');
    rect.setAttribute('stroke-width', String(Math.max(1, width / 2)));
    overlay.appendChild(rect);
    return;
  }

  if (type === 'arrow') {
    const arrow = document.createElementNS(SVG_NS, 'polygon');
    const half = size / 2;
    const pointsAttr = `${point.x},${point.y} ${point.x - size},${point.y - half} ${point.x - size},${point.y + half}`;
    arrow.setAttribute('points', pointsAttr);
    arrow.setAttribute('stroke', stroke);
    arrow.setAttribute('fill', filled ? stroke : 'transparent');
    arrow.setAttribute('stroke-width', String(Math.max(1, width / 2)));
    overlay.appendChild(arrow);
  }
}

export function drawDebugContainer(overlay: SVGSVGElement, container: HTMLElement): void {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', '0');
  rect.setAttribute('y', '0');
  rect.setAttribute('width', String(container.clientWidth));
  rect.setAttribute('height', String(container.clientHeight));
  rect.setAttribute('fill', 'transparent');
  rect.setAttribute('stroke', '#00a3ff');
  rect.setAttribute('stroke-width', '1');
  rect.setAttribute('stroke-dasharray', '4 4');
  overlay.appendChild(rect);
}

export function drawDebug(overlay: SVGSVGElement, points: ResolvedPoint[], pathId: string): void {
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.classList.add('dot2dot-debug-node');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', '#ff00a8');
    overlay.appendChild(circle);

    const text = document.createElementNS(SVG_NS, 'text');
    text.classList.add('dot2dot-debug-label');
    text.setAttribute('x', String(point.x + 6));
    text.setAttribute('y', String(point.y - 6));
    text.setAttribute('fill', '#ff00a8');
    text.setAttribute('font-size', '11');
    text.textContent = point.label ?? `${pathId}:${index + 1}`;
    overlay.appendChild(text);
  }
}
