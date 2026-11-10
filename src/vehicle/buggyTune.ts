// Buggy handling (Buggy.tsx). Its own file so the component hot-reloads cleanly in dev.
/** Handling. Tuned by feel; forces are in newtons on a ~150 kg chassis. */
export const TUNE = {
  /** Unstuck hop (Space / hop button when nearly stopped): impulses on the ~150 kg chassis. */
  hopMaxSpeed: 1.2,
  hopUp: 800,
  hopForward: 420,
  maxSpeed: 11,
  turboSpeed: 15,
  reverseSpeed: 5,
  engine: 850,
  turboEngine: 1200,
  brake: 6,
  roll: 0.6,
  steerLow: 0.6,
  steerHigh: 0.2,
  steerRate: 7,
  grip: 3.2,
  /** Handbrake: rear grip and sideways stiffness drop, and a little yaw push swings the tail. */
  driftGrip: 0.6,
  driftSide: 0.35,
  driftBrake: 0,
  driftPush: 10,
  driftYaw: 0.5,
  maxYawRate: 2.3,
  sideStiff: 1.6,
  stiffness: 32,
  compression: 2.6,
  relaxation: 3.2,
  travel: 0.25,
  level: 0.35,
};
