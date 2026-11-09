// Torch positions for Rosalila's tunnel and chamber (lighting + visuals share them).
import * as THREE from "three";
import { ROSALILA } from "../world/siteData";

const R = ROSALILA;
const [cx, cz] = R.center;
const hw = R.chamber[0] / 2 - 0.4;
const hd = R.chamber[2] / 2 - 0.4;
const y = R.baseY + 2.2;
const T = R.tunnel;

export const TORCHES: THREE.Vector3[] = [
  new THREE.Vector3(T.fromX + 0.6, y - 0.3, T.z - T.width / 2 - 0.6), // entrance, outside
  new THREE.Vector3(T.fromX + 0.6, y - 0.3, T.z + T.width / 2 + 0.6),
  new THREE.Vector3((T.fromX + T.toX) / 2, y + 0.6, T.z - T.width / 2 + 0.12), // on the tunnel wall
  new THREE.Vector3(cx + hw, y, cz - hd),
  new THREE.Vector3(cx - hw, y, cz - hd),
  new THREE.Vector3(cx + hw, y, cz + hd),
  new THREE.Vector3(cx - hw, y, cz + hd),
  new THREE.Vector3(cx - hw, y, cz), // lights Rosalila's west front
];
