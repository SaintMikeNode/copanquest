// Torch positions for Rosalila's tunnel and chamber (lighting + visuals share them).
// Max 8 (shader array). Indices in CENSERS are clay censers on the floor, not wall torches:
// censers and offerings were found inside Rosalila (Asociación Copán).
//
// Wall torches hang on a bracket a few centimeters off the actual block wall. Carved walls
// snap outward to the 0.5 m block grid, so positions come from the snapped walls, not from
// the raw chamber/tunnel numbers (which left torches floating up to 0.4 m off the wall).
import * as THREE from "three";
import { BLOCK } from "../voxel/blocks";
import { MOUNDS, ROSALILA } from "../world/siteData";

const R = ROSALILA;
const C = R.chamber;
const T = R.tunnel;
const y = R.baseY + 2.2;
const front = R.center[0] - R.depth / 2; // Rosalila's west façade (x)

/** Snap a carved wall outward to the block grid. */
const down = (v: number) => Math.floor(v / BLOCK) * BLOCK;
const up = (v: number) => Math.ceil(v / BLOCK) * BLOCK;

const temple16 = MOUNDS.find((m) => m.id === "temple16")!;
const eastFace = temple16.center[0] + temple16.size[0] / 2; // Temple 16's east wall (x), where the tunnel opens
const tunnelN = down(T.z - T.width / 2); // tunnel walls (z)
const tunnelS = up(T.z + T.width / 2);
const westWall = down(C.x0); // chamber walls
const eastWall = up(C.x1);
const northWall = down(C.z0);
const southWall = up(C.z1);

/** Distance from the wall to the flame. */
const OFF = 0.2;

/** Outward wall normal [x, z] for each wall torch; null for censers. */
export const TORCH_WALL: ([number, number] | null)[] = [
  [1, 0], // beside the tunnel entrance, on Temple 16's east wall
  [1, 0],
  [0, 1], // on the tunnel's north wall
  [-1, 0], // chamber east wall, next to where the tunnel comes in
  [1, 0], // chamber west wall, high, lighting the façade
  [1, 0],
  null, // censers flanking Rosalila's door
  null,
];

export const TORCHES: THREE.Vector3[] = [
  new THREE.Vector3(eastFace + OFF, y - 0.3, tunnelN - 0.9),
  new THREE.Vector3(eastFace + OFF, y - 0.3, tunnelS + 0.9),
  new THREE.Vector3((eastFace + eastWall) / 2, y + 0.4, tunnelN + OFF),
  new THREE.Vector3(eastWall - OFF, y, (northWall + tunnelN) / 2),
  new THREE.Vector3(westWall + OFF, y + 1.5, northWall + 1.2),
  new THREE.Vector3(westWall + OFF, y + 1.5, southWall - 1.2),
  new THREE.Vector3(front - 2.2, R.baseY + 1.05, R.center[1] - 2.6),
  new THREE.Vector3(front - 2.2, R.baseY + 1.05, R.center[1] + 2.6),
];

export const CENSERS = new Set([6, 7]);
