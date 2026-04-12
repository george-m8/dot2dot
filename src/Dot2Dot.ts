import { createOverlay, getActiveBreakpoint, normalizePaths, resolveContainer, setOverlaySize } from './dom';
import { applyEndpointExtension, buildPolyline, buildRoundedPath, resolveNodePoint } from './geometry';
import { clearOverlay, drawDebug, drawDebugContainer, drawPath } from './render';
import type { Dot2DotConfig, NormalizedPathConfig, PathConfig, ResolvedPoint } from './types';
import { DEFAULT_CONFIG, debounce, ensureContainerPositioning, resolveDebugFlag, warn } from './utils';

export class Dot2Dot {
  private config: Dot2DotConfig;
  private container: HTMLElement;
  private overlay: SVGSVGElement;
  private paths: NormalizedPathConfig[];
  private activeBreakpoint: string | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private onResize: () => void;
  private onScroll: () => void;
  private debugEnabled = false;

  constructor(config: Dot2DotConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    this.debugEnabled = resolveDebugFlag(this.config.debug);

    this.container = resolveContainer(this.config.container);
    ensureContainerPositioning(this.container);

    this.paths = normalizePaths(this.config);
    this.overlay = createOverlay(this.container);
    this.overlay.dataset.dot2dotDebug = String(this.debugEnabled);
    if (this.debugEnabled) {
      this.container.classList.add('dot2dot-debug-enabled');
      warn(true, 'Debug mode enabled. Use ?dot2dot-debug=false to disable quickly.');
    }

    this.onResize = debounce(() => {
      this.redraw();
    }, this.config.responsive?.debounceMs ?? 60);

    this.onScroll = this.config.redrawOnScroll ? this.onResize : () => undefined;

    this.setupObservers();
    this.redraw();
  }

  static init(config: Dot2DotConfig): Dot2Dot {
    return new Dot2Dot(config);
  }

  redraw(): void {
    setOverlaySize(this.overlay, this.container);
    clearOverlay(this.overlay);

    if (this.debugEnabled) {
      drawDebugContainer(this.overlay, this.container);
    }

    const nextBreakpoint = getActiveBreakpoint(this.container, this.config.responsive);
    if (nextBreakpoint !== this.activeBreakpoint && this.debugEnabled) {
      warn(true, `Active breakpoint: ${nextBreakpoint ?? 'none'}`);
    }
    this.activeBreakpoint = nextBreakpoint;

    for (const path of this.paths) {
      if (!path.visible) {
        continue;
      }

      const points = this.resolvePathPoints(path);
      if (points.length < 2) {
        warn(this.debugEnabled, `Path "${path.id}" skipped: fewer than 2 valid nodes.`);
        continue;
      }

      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      let workingPoints = points.map((point) => ({ x: point.x, y: point.y }));

      workingPoints = applyEndpointExtension(workingPoints, path.start, 'start', this.container, rootFontSize);
      workingPoints = applyEndpointExtension(workingPoints, path.end, 'end', this.container, rootFontSize);

      const routed = buildPolyline(workingPoints, path.routeMode);
      const d = buildRoundedPath(routed, path.style.radius ?? 0);
      drawPath(this.overlay, path, d, points);

      if (this.debugEnabled) {
        drawDebug(this.overlay, points, path.id);
      }
    }
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);

    this.overlay.remove();
  }

  addPath(pathConfig: PathConfig): void {
    const normalized = normalizePaths({ ...this.config, autoPaths: false, paths: [pathConfig] });
    this.paths.push(...normalized);
    this.redraw();
  }

  removePath(pathId: string): void {
    this.paths = this.paths.filter((path) => path.id !== pathId);
    this.redraw();
  }

  showPath(pathId: string): void {
    const path = this.paths.find((item) => item.id === pathId);
    if (!path) {
      return;
    }
    path.visible = true;
    this.redraw();
  }

  hidePath(pathId: string): void {
    const path = this.paths.find((item) => item.id === pathId);
    if (!path) {
      return;
    }
    path.visible = false;
    this.redraw();
  }

  private resolvePathPoints(path: NormalizedPathConfig): ResolvedPoint[] {
    const points: ResolvedPoint[] = [];
    for (const node of path.nodes) {
      const point = resolveNodePoint(this.container, node, this.activeBreakpoint);
      if (point) {
        points.push(point);
      }
    }
    return points;
  }

  private setupObservers(): void {
    if (this.config.observeResize) {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.container);
      window.addEventListener('resize', this.onResize, { passive: true });
    }

    if (this.config.observeMutations) {
      this.mutationObserver = new MutationObserver(this.onResize);
      this.mutationObserver.observe(this.container, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: false
      });
    }

    if (this.config.redrawOnScroll) {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }
}
