export type UnitValue = number | string;

export type AnchorObject = {
  x: UnitValue;
  y: UnitValue;
};

export type AnchorPreset =
  | 'center'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type AnchorSpec = AnchorPreset | string | AnchorObject;

export type ResponsiveNodeOverride = {
  target?: string | HTMLElement;
  anchor?: AnchorSpec;
  hidden?: boolean;
};

export type NodeRef =
  | string
  | {
      target: string | HTMLElement;
      anchor?: AnchorSpec;
      responsive?: Record<string, ResponsiveNodeOverride>;
      role?: 'waypoint' | 'start' | 'end';
      label?: string;
    };

export type EndpointExtendMode =
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

export type EndpointConfig = {
  extend?: {
    mode: EndpointExtendMode;
    distance?: UnitValue;
  };
  cap?: {
    type?: 'none' | 'circle' | 'square' | 'arrow';
    size?: number;
    filled?: boolean;
  };
  fade?:
    | boolean
    | {
        length?: UnitValue;
        opacityFrom?: number;
        opacityTo?: number;
      };
};

export type PathStyleConfig = {
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

export type AnimationConfig = {
  type?: 'none' | 'draw';
  duration?: number;
  delay?: number;
  easing?: string;
};

export type PathConfig = {
  id?: string;
  nodes: NodeRef[];
  start?: EndpointConfig;
  end?: EndpointConfig;
  style?: PathStyleConfig;
  animation?: AnimationConfig;
  routeMode?: 'hv' | 'vh' | 'auto' | 'straight';
  visible?: boolean;
};

export type ResponsiveConfig = {
  mode?: 'viewport' | 'container';
  active?: 'auto' | string;
  breakpoints?: Record<
    string,
    {
      min?: number;
      max?: number;
    }
  >;
  debounceMs?: number;
};

export type Dot2DotConfig = {
  container: string | HTMLElement;
  paths?: PathConfig[];
  defaults?: PathStyleConfig;
  responsive?: ResponsiveConfig;
  observeResize?: boolean;
  observeMutations?: boolean;
  redrawOnScroll?: boolean;
  autoPaths?: boolean;
  debug?: boolean;
};

export type NormalizedNode = {
  target: string | HTMLElement;
  anchor: AnchorSpec;
  responsive?: Record<string, ResponsiveNodeOverride>;
  role?: 'waypoint' | 'start' | 'end';
  label?: string;
};

export type NormalizedPathConfig = {
  id: string;
  nodes: NormalizedNode[];
  start?: EndpointConfig;
  end?: EndpointConfig;
  style: PathStyleConfig;
  animation?: AnimationConfig;
  routeMode: 'hv' | 'vh' | 'auto' | 'straight';
  visible: boolean;
};

export type ResolvedPoint = {
  x: number;
  y: number;
  target: HTMLElement;
  label?: string;
};

export type ResolvedPath = {
  config: NormalizedPathConfig;
  points: ResolvedPoint[];
};
