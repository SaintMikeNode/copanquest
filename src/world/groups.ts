// Collision groups. Decorations (bushes, tree trunks, village boxes; voxel.worker colliders) are
// in their own group so actors can be placed on the real ground, never on top of a bush.
import { interactionGroups } from "@react-three/rapier";

/** Group of the decoration colliders. They still collide with everything (the player bumps into them). */
export const DECO_GROUPS = interactionGroups(1);
/** Query filter that sees everything except decorations. */
export const NO_DECO_FILTER = interactionGroups(0, [0]);
