import { Dot2Dot } from './Dot2Dot';
import type { Dot2DotConfig } from './types';

export function init(config: Dot2DotConfig): Dot2Dot {
  return Dot2Dot.init(config);
}

export type {
  AnimationConfig,
  AnchorObject,
  AnchorPreset,
  AnchorSpec,
  EndpointConfig,
  EndpointExtendMode,
  NodeRef,
  PathConfig,
  PathStyleConfig,
  ResolvedPath,
  ResolvedPoint,
  ResponsiveConfig,
  ResponsiveNodeOverride,
  UnitValue
} from './types';

export { Dot2Dot };
export default Dot2Dot;
