import type { AnchorObject, AnchorPreset, AnchorSpec, Dot2DotConfig, PathStyleConfig, UnitValue } from './types';

const ANCHOR_PRESETS: Record<AnchorPreset, AnchorObject> = {
  center: { x: '50%', y: '50%' },
  top: { x: '50%', y: '0%' },
  right: { x: '100%', y: '50%' },
  bottom: { x: '50%', y: '100%' },
  left: { x: '0%', y: '50%' },
  'top-left': { x: '0%', y: '0%' },
  'top-right': { x: '100%', y: '0%' },
  'bottom-left': { x: '0%', y: '100%' },
  'bottom-right': { x: '100%', y: '100%' }
};

export const DEFAULT_STYLE: PathStyleConfig = {
  stroke: '#111',
  width: 4,
  radius: 16,
  opacity: 1,
  zIndex: 1,
  lineCap: 'round',
  lineJoin: 'round'
};

export const DEFAULT_CONFIG: Required<Pick<Dot2DotConfig, 'observeResize' | 'observeMutations' | 'redrawOnScroll' | 'debug'>> = {
  observeResize: true,
  observeMutations: false,
  redrawOnScroll: false,
  debug: false
};

export const DEFAULT_BREAKPOINTS = {
  mobile: { max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024 }
};

export function parseUnit(value: UnitValue | undefined, total: number, rootFontSize: number): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const trimmed = value.trim();
  const calcMatch = trimmed.match(/^calc\(\s*100%\s*-\s*(.+)\)$/i);
  if (calcMatch) {
    const inner = calcMatch[1]?.trim();
    if (inner) {
      return total - parseUnit(inner, total, rootFontSize);
    }
  }
  if (trimmed.endsWith('%')) {
    return (Number.parseFloat(trimmed) / 100) * total;
  }
  if (trimmed.endsWith('px')) {
    return Number.parseFloat(trimmed);
  }
  if (trimmed.endsWith('rem')) {
    return Number.parseFloat(trimmed) * rootFontSize;
  }
  if (trimmed.endsWith('em')) {
    return Number.parseFloat(trimmed) * rootFontSize;
  }
  if (trimmed.endsWith('vw')) {
    return (Number.parseFloat(trimmed) / 100) * window.innerWidth;
  }
  if (trimmed.endsWith('vh')) {
    return (Number.parseFloat(trimmed) / 100) * window.innerHeight;
  }
  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizeAnchor(anchor?: AnchorSpec): AnchorObject {
  if (!anchor) {
    return ANCHOR_PRESETS.center;
  }
  if (typeof anchor === 'object') {
    return {
      x: anchor.x ?? '50%',
      y: anchor.y ?? '50%'
    };
  }
  if (anchor in ANCHOR_PRESETS) {
    return ANCHOR_PRESETS[anchor as AnchorPreset];
  }

  const parsed = parseAnchorString(anchor);
  if (parsed) {
    return parsed;
  }

  return ANCHOR_PRESETS.center;
}

function parseAnchorString(input: string): AnchorObject | null {
  const tokens = input.trim().split(/\s+/);
  if (tokens.length === 0) {
    return null;
  }

  let x: string | number = '50%';
  let y: string | number = '50%';

  const leftIndex = tokens.indexOf('left');
  const rightIndex = tokens.indexOf('right');
  const topIndex = tokens.indexOf('top');
  const bottomIndex = tokens.indexOf('bottom');
  const centerIndex = tokens.indexOf('center');

  if (centerIndex !== -1 && tokens.length === 1) {
    return { x: '50%', y: '50%' };
  }

  if (leftIndex !== -1) {
    x = tokens[leftIndex + 1] ?? '0%';
  } else if (rightIndex !== -1) {
    const next = tokens[rightIndex + 1] ?? '0';
    x = `calc(100% - ${next})`;
  }

  if (topIndex !== -1) {
    y = tokens[topIndex + 1] ?? '0%';
  } else if (bottomIndex !== -1) {
    const next = tokens[bottomIndex + 1] ?? '0';
    y = `calc(100% - ${next})`;
  }

  if (tokens.length === 2 && !Number.isNaN(Number.parseFloat(tokens[0])) && !Number.isNaN(Number.parseFloat(tokens[1]))) {
    x = tokens[0];
    y = tokens[1];
  }

  return { x, y };
}

export function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): T {
  let timeout: number | undefined;
  return ((...args: never[]) => {
    if (timeout != null) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      fn(...args);
    }, wait);
  }) as T;
}

export function warn(debug: boolean, message: string): void {
  if (debug) {
    console.warn(`[Dot2Dot] ${message}`);
  }
}

export function resolveDebugFlag(configDebug?: boolean): boolean {
  const queryOverride = getDebugFlagFromQuery();
  if (queryOverride == null) {
    return Boolean(configDebug);
  }
  return queryOverride;
}

function getDebugFlagFromQuery(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = new URLSearchParams(window.location.search).get('dot2dot-debug');
  if (value == null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return true;
}

export function uniqueId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

export function mergeStyle(base: PathStyleConfig, override?: PathStyleConfig): PathStyleConfig {
  return { ...base, ...(override ?? {}) };
}

export function ensureContainerPositioning(container: HTMLElement): void {
  const style = getComputedStyle(container);
  if (style.position === 'static') {
    container.style.position = 'relative';
  }
}
