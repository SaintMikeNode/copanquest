import { useMemo } from "react";
import { buildGreybox } from "./buildGreybox";
import { buildMonument } from "../voxel/monumentArt";
import { createMonumentMaterial } from "../voxel/material";

/** Stelae and altars as carved pixel-art blocks (same 32 px/m density as the world). */
export function Monuments() {
  const items = useMemo(
    () =>
      buildGreybox().monuments.map((m, i) => {
        const { geometry, texture } = buildMonument(m.id, m.kind, m.size, 900 + i * 17);
        return { m, geometry, material: createMonumentMaterial(texture) };
      }),
    [],
  );
  return (
    <>
      {items.map(({ m, geometry, material }) => (
        <mesh
          key={m.id}
          geometry={geometry}
          material={material}
          position={m.position}
          rotation-y={m.rotY}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}
