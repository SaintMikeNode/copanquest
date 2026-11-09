// Everything the explorer's camera can photograph, with live positions.
import * as THREE from "three";
import type { L10n } from "../i18n";
import { ANIMALS, type SubjectKind } from "./gameData";
import { POIS } from "../poi/poiData";
import { TALKERS } from "../npc/npcData";

export interface SubjectInfo {
  id: string;
  kind: SubjectKind;
  name: L10n;
  fact: L10n;
}

export const SUBJECTS: SubjectInfo[] = [
  ...ANIMALS.map((a) => ({ id: a.id, kind: "animal" as const, name: a.name, fact: a.fact })),
  ...POIS.map((p) => ({
    id: p.id,
    kind: "monument" as const,
    name: p.title,
    fact: { es: p.body.es.split(/(?<=[.!?])\s/)[0], en: p.body.en.split(/(?<=[.!?])\s/)[0] },
  })),
  ...TALKERS.map((t) => ({ id: t.id, kind: "person" as const, name: t.name, fact: t.lines[0] })),
];
export const SUBJECT_BY_ID: Record<string, SubjectInfo> = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

/** Live positions: instance key → { subject id, position }. Actors update these each frame. */
export const subjectPositions = new Map<string, { id: string; pos: THREE.Vector3 }>();

export function trackSubject(key: string, id: string, x: number, y: number, z: number) {
  let e = subjectPositions.get(key);
  if (!e) subjectPositions.set(key, (e = { id, pos: new THREE.Vector3() }));
  e.pos.set(x, y, z);
}

// Monuments don't move.
for (const p of POIS) trackSubject(`poi:${p.id}`, p.id, p.position[0], (p.y ?? 0) + Math.min(3, p.markerHeight * 0.5), p.position[1]);
