// Collision groups. Decorations (bushes, tree trunks, village boxes; voxel.worker colliders) are
// in their own group so actors can be placed on the real ground, never on top of a bush.
import { interactionGroups } from "@react-three/rapier";

/** Group of the decoration colliders. They still collide with everything (the player bumps into them). */
export const DECO_GROUPS = interactionGroups(1);
/** Query filter that sees everything except decorations. */
export const NO_DECO_FILTER = interactionGroups(0, [0]);

/**
 * Stair ramps (the invisible wedge over each staircase): in the default group 0, so everything
 * else (player, villagers' ground rays) still uses them, and in group 2.
 */
export const RAMP_GROUPS = interactionGroups([0, 2]);
/**
 * The buggy (vehicle/Buggy.tsx): its chassis and wheel rays skip the stair ramps, so stairs are
 * a wall of stone steps it can't drive up. It still hits everything else (all other colliders
 * are in every group, decorations in group 1).
 */
export const BUGGY_GROUPS = interactionGroups(4, [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
