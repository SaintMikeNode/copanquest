// Types for the React Bits PixelBlast component (PixelBlast.jsx, plain JS).
import type { CSSProperties, JSX } from "react";

export interface PixelBlastProps {
  variant?: "square" | "circle" | "triangle" | "diamond" | "cross" | "ring";
  pixelSize?: number;
  color?: string;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
  patternScale?: number;
  patternDensity?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleIntensityScale?: number;
  rippleThickness?: number;
  rippleSpeed?: number;
  autoPauseOffscreen?: boolean;
  speed?: number;
  transparent?: boolean;
  edgeFade?: number;
  noiseAmount?: number;
  softness?: number;
  smoothing?: number;
  glow?: number;
  twinkle?: number;
  drift?: number;
  driftAngle?: number;
  hoverEffect?: "none" | "grow" | "reveal";
  hoverRadius?: number;
  autoRipple?: number;
  tiltX?: number;
  tiltY?: number;
  intro?: boolean;
  variation?: number;
  lightMode?: boolean;
  dpr?: number;
}

declare const PixelBlast: (props: PixelBlastProps) => JSX.Element;
export default PixelBlast;
