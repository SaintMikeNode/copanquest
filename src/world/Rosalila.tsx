import { useMemo } from "react";
import * as THREE from "three";
import { buildRosalila } from "../voxel/rosalilaArt";
import { createMonumentMaterial } from "../voxel/material";
import { LAYER_WORLD } from "../game/layers";
import { ROSALILA_ROT_Y, rosalilaToWorld } from "./rosalilaShape";

/** Rosalila: painted stucco relief model inside its chamber in Temple 16 (2 draw calls). */
export function Rosalila() {
  const { body, cards, mBody, mCards } = useMemo(() => {
    const { body, cards, texture } = buildRosalila();
    const mBody = createMonumentMaterial(texture);
    const mCards = createMonumentMaterial(texture);
    mCards.side = THREE.DoubleSide;
    // In the dark chamber the colors still read faintly; torches do the rest.
    mBody.uniforms.glow.value = 0.24;
    mCards.uniforms.glow.value = 0.24;
    return { body, cards, mBody, mCards };
  }, []);
  return (
    <group position={rosalilaToWorld(0, 0, 0)} rotation-y={ROSALILA_ROT_Y}>
      <mesh geometry={body} material={mBody} layers-mask={1 | (1 << LAYER_WORLD)} receiveShadow />
      <mesh geometry={cards} material={mCards} layers-mask={1 | (1 << LAYER_WORLD)} />
    </group>
  );
}
