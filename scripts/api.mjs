/**
 * Public macro API for the LaserLlama Alternate Artificer - Junker module.
 *
 * Exposed on `game.modules.get(MODULE_ID).api` after the `ready` hook.
 * All functions are independent of world setting toggles — callers are
 * responsible for any setting checks they wish to apply.
 */

import { MODULE_ID, FLAGS, RIG_STATS_EFFECT_IMG_DEFAULT } from "./constants.mjs";
import { getArtificerLevel } from "./helpers.mjs";
import { getRigStats } from "./rig-stats.mjs";
import { createRigStatsActiveEffect, removeRigStatsActiveEffect } from "./piloting/rig-stats-effect.mjs";
import { cleanupRigData as _cleanupRigData } from "./class-feature/class-feature-hooks.mjs";

/**
 * Applies the Rig Stats active effect to the actor.
 * Includes fully-authoritative changes (zeroes out unused pilot values).
 *
 * @param {Actor} actor
 */
export async function applyRigStats(actor, fullyAuthoritative = true) {
  const isTitanic     = actor.getFlag(MODULE_ID, FLAGS.IS_TITANIC) ?? false;
  const rigStats      = getRigStats(isTitanic);
  const computedHpMax = 5 + 5 * getArtificerLevel(actor);
  const effectImg     = actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_STATS_EFFECT_IMG_DEFAULT;
  await createRigStatsActiveEffect(actor, rigStats, computedHpMax, effectImg, fullyAuthoritative);
}

/**
 * Removes the Rig Stats active effect from the actor.
 *
 * @param {Actor} actor
 */
export async function removeRigStats(actor) {
  await removeRigStatsActiveEffect(actor);
}

/**
 * Opens the Rig data cleanup dialog for the given actor. Stops piloting first
 * if the actor is currently piloting, then offers checkboxes to remove the
 * Piloting Rig effect, Rig Slam weapon, and module flags.
 *
 * @param {Actor} actor
 */
export async function cleanupRigData(actor) {
  await _cleanupRigData(actor);
}
