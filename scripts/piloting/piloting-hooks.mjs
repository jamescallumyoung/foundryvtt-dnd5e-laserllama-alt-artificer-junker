import { MODULE_ID, FLAGS, RIG_IMG_DEFAULT, RIG_STATS_EFFECT_IMG_DEFAULT } from "../constants.mjs";
import { getArtificerLevel } from "../helpers.mjs";
import { getRigStats } from "../rig-stats.mjs";
import { stashAndUpdate, unstashAndRestore } from "./stash.mjs";
import { createRigStatsActiveEffect, removeRigStatsActiveEffect } from "./rig-stats-effect.mjs";
import { createRigFeatures, removeRigFeatures } from "./rig-features.mjs";

// ---------------------------------------------------------------------------
// Start piloting
// ---------------------------------------------------------------------------

async function startPiloting(actor) {
  const applyRigStats          = game.settings.get(MODULE_ID, "applyRigStats");
  const fullyAuthoritativeStats = game.settings.get(MODULE_ID, "fullyAuthoritativeStats");
  const resizeTokens            = game.settings.get(MODULE_ID, "resizeTokens");
  const addRigFeaturesSetting   = game.settings.get(MODULE_ID, "addRigFeatures");

  const rigHp  = actor.getFlag(MODULE_ID, FLAGS.RIG_HP) ?? 0;
  const rigImg = actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_IMG_DEFAULT;
  await stashAndUpdate(actor, rigHp, rigImg, resizeTokens);

  const isTitanic     = actor.getFlag(MODULE_ID, FLAGS.IS_TITANIC) ?? false;
  const rigStats      = getRigStats(isTitanic);
  const computedHpMax = 5 + 5 * getArtificerLevel(actor);

  if (applyRigStats) {
    const effectImg = actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_STATS_EFFECT_IMG_DEFAULT;
    await createRigStatsActiveEffect(actor, rigStats, computedHpMax, effectImg, fullyAuthoritativeStats);
  }

  if (addRigFeaturesSetting) {
    await createRigFeatures(actor, rigStats);
  }
}

// ---------------------------------------------------------------------------
// Stop piloting
// ---------------------------------------------------------------------------

export async function stopPiloting(actor) {
  // (undo all in the reverse order they were applied in startPiloting)

  // Persist current rig HP before restoring actor stats.
  await actor.setFlag(MODULE_ID, FLAGS.RIG_HP, actor.system.attributes.hp.value);

  await removeRigFeatures(actor);

  await removeRigStatsActiveEffect(actor);

  const hasStash = actor.getFlag(MODULE_ID, FLAGS.VALUE_STASH) != null;
  if (hasStash) {
    await unstashAndRestore(actor);
  }
}

// ---------------------------------------------------------------------------
// Effect toggle handler
// ---------------------------------------------------------------------------

async function onUpdateActiveEffect(effect, changes, _options, userId) {
  if (userId !== game.userId) return;
  if (!effect.flags?.[MODULE_ID]?.[FLAGS.IS_PILOTING_RIG_EFFECT]) return;
  if (!("disabled" in changes)) return;

  const actor = effect.parent;
  if (!actor) return;

  if (changes.disabled === false) await startPiloting(actor);
  else if (changes.disabled === true) await stopPiloting(actor);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerPilotingHooks() {
  Hooks.on("updateActiveEffect", onUpdateActiveEffect);
}
