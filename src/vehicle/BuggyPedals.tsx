// Touch controls while driving (TouchControls.tsx swaps them in): the joystick on the left steers,
// with a small hop button above it (drift while moving, a little hop to get unstuck when stopped);
// on the right, level with the stick, a brake and a gas pedal (hold), drawn as pixel-art pedals.
// They set `pedals`, which Buggy.tsx reads every physics step. The gas pedal drives at the turbo
// speed (there's no Shift on a phone).
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from "react";
import { useT } from "../i18n";
import { pedals } from "./buggyState";

type Key = keyof typeof pedals;

const FRAME = "#2b2926";
const PLATE = "#5c6064";
const RIDGE = "#3b3e42";
const SHINE = "#8b9095";
const ARM = "#45484c";

/** A pedal on a pixel grid: arm on top, a ridged rubber plate, a colored band at the bottom. */
function PedalArt({ w, h, band }: { w: number; h: number; band: string }) {
  const r: ReactElement[] = [];
  const px = (x: number, y: number, pw: number, ph: number, c: string) => r.push(<rect key={r.length} x={x} y={y} width={pw} height={ph} fill={c} />);
  const armW = Math.max(2, Math.round(w / 5));
  px(Math.round((w - armW) / 2), 0, armW, 3, ARM);
  px(0, 3, w, h - 3, FRAME);
  px(1, 4, w - 2, h - 5, PLATE);
  px(1, 4, w - 2, 1, SHINE);
  for (let y = 6; y < h - 4; y += 3) px(3, y, w - 6, 1, RIDGE);
  px(1, h - 3, w - 2, 2, band);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" shapeRendering="crispEdges" aria-hidden="true">
      {r}
    </svg>
  );
}

/** Hop button, in the pedals' style: framed metal plate, an up arrow, an amber band. */
function HopArt() {
  const W = 16;
  const r: ReactElement[] = [];
  const px = (x: number, y: number, pw: number, ph: number, c: string) => r.push(<rect key={r.length} x={x} y={y} width={pw} height={ph} fill={c} />);
  px(0, 0, W, W, FRAME);
  px(1, 1, W - 2, W - 2, PLATE);
  px(1, 1, W - 2, 1, SHINE);
  px(1, W - 3, W - 2, 2, "#f2c42c");
  // Arrow: a stepped head and a stem, with a dark shadow one pixel lower.
  const arrow = (dy: number, c: string) => {
    px(7, 3 + dy, 2, 1, c);
    px(6, 4 + dy, 4, 1, c);
    px(5, 5 + dy, 6, 1, c);
    px(4, 6 + dy, 8, 1, c);
    px(7, 7 + dy, 2, 4, c);
  };
  arrow(1, RIDGE);
  arrow(0, "#fff1d2");
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" shapeRendering="crispEdges" aria-hidden="true">
      {r}
    </svg>
  );
}

function usePedal(key: Key) {
  const [down, setDown] = useState(false);
  const set = (on: boolean) => {
    pedals[key] = on;
    setDown(on);
  };
  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      set(true);
    },
    onPointerUp: () => set(false),
    onPointerCancel: () => set(false),
    onLostPointerCapture: () => set(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  return { down, handlers };
}

export function BuggyPedals() {
  const t = useT();
  const gas = usePedal("gas");
  const brake = usePedal("brake");
  const hop = usePedal("hop");
  // Let go of everything when the controls go away (getting out, a menu opening).
  useEffect(
    () => () => {
      pedals.gas = pedals.brake = pedals.hop = false;
    },
    [],
  );
  return (
    <>
      {/* Left, above the steering stick. */}
      <button className={hop.down ? "pedal-hop on" : "pedal-hop"} aria-label={t("buggy.hop")} data-silent {...hop.handlers}>
        <HopArt />
      </button>
      {/* Right, level with the stick: brake, then gas on the outside like in a car. */}
      <div className="buggy-pedals">
        <button className={brake.down ? "pedal pedal-brake on" : "pedal pedal-brake"} aria-label={t("buggy.brake")} data-silent {...brake.handlers}>
          <PedalArt w={22} h={16} band="#c8452c" />
        </button>
        <button className={gas.down ? "pedal pedal-gas on" : "pedal pedal-gas"} aria-label={t("buggy.gas")} data-silent {...gas.handlers}>
          <PedalArt w={14} h={24} band="#3fae5a" />
        </button>
      </div>
    </>
  );
}
