// Torch positions for Rosalila's tunnel and chamber (lighting + visuals share them).
// Max 8 (shader array). Indices in CENSERS are clay censers on the floor, not wall torches:
// censers and offerings were found inside Rosalila (Asociación Copán).
import * as THREE from "three";
import { ROSALILA } from "../world/siteData";

const R = ROSALILA;
const C = R.chamber;
const y = R.baseY + 2.2;
const T = R.tunnel;
const front = R.center[0] - R.depth / 2; // west façade (x)

export const TORCHES: THREE.Vector3[] = [
  new THREE.Vector3(T.fromX + 0.6, y - 0.3, T.z - T.width / 2 - 0.6), // entrance, outside
  new THREE.Vector3(T.fromX + 0.6, y - 0.3, T.z + T.width / 2 + 0.6),
  new THREE.Vector3((T.fromX + T.toX) / 2, y + 0.6, T.z - T.width / 2 + 0.12), // on the tunnel wall
  new THREE.Vector3(C.x1 - 0.4, y, C.z0 + 0.4), // where the tunnel opens into the chamber
  new THREE.Vector3(C.x0 + 0.4, y + 1.5, C.z0 + 0.4), // west corners, high: light the façade
  new THREE.Vector3(C.x0 + 0.4, y + 1.5, C.z1 - 0.4),
  new THREE.Vector3(front - 2.2, R.baseY + 1.05, R.center[1] - 2.6), // censers flanking the door
  new THREE.Vector3(front - 2.2, R.baseY + 1.05, R.center[1] + 2.6),
];

export const CENSERS = new Set([6, 7]);
