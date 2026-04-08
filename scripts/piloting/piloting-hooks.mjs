import { MODULE_ID, FLAGS, RIG_ARMOR_CALC, RIG_IMG_DEFAULT } from "../constants.mjs";
import { getArtificerLevel, getRigStatsEffect } from "../helpers.mjs";
import { getRigStats } from "../rig-stats.mjs";

// ---------------------------------------------------------------------------
// Rig Stats effect — changes builders
// ---------------------------------------------------------------------------

/**
 * Returns the "necessary" Active Effect changes for the Rig Stats effect:
 * the core stat overrides that make the actor function as a rig.
 *
 * @param {object} rigStats   Stat block from getRigStats().
 * @param {number} computedHpMax
 * @returns {object[]}
 */
function buildNecessaryChanges(rigStats, computedHpMax) {
  const OVERRIDE = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
  const ADD      = CONST.ACTIVE_EFFECT_MODES.ADD;
  const P        = 125;

  return [
    // Abilities
    { key: "system.abilities.str.value", mode: OVERRIDE, value: String(rigStats.abilities.str), priority: P },
    { key: "system.abilities.dex.value", mode: OVERRIDE, value: String(rigStats.abilities.dex), priority: P },
    { key: "system.abilities.con.value", mode: OVERRIDE, value: String(rigStats.abilities.con), priority: P },

    // HP maximum
    { key: "system.attributes.hp.max",  mode: OVERRIDE, value: String(computedHpMax),          priority: P },

    // AC calculation type
    { key: "system.attributes.ac.calc", mode: OVERRIDE, value: RIG_ARMOR_CALC,                 priority: P },

    // Movement (rig speeds)
    { key: "system.attributes.movement.walk",  mode: OVERRIDE, value: String(rigStats.movement.walk),  priority: P },
    { key: "system.attributes.movement.climb", mode: OVERRIDE, value: String(rigStats.movement.climb), priority: P },

    // Traits — one ADD entry per value so existing pilot traits are preserved in the Set
    ...rigStats.damageImmunities.map(v   => ({ key: "system.traits.di.value", mode: ADD, value: v, priority: P })),
    ...rigStats.conditionImmunities.map(v => ({ key: "system.traits.ci.value", mode: ADD, value: v, priority: P })),
    ...rigStats.damageResistances.map(v  => ({ key: "system.traits.dr.value", mode: ADD, value: v, priority: P })),
  ];
}

/**
 * Returns the "fully-authoritative" Active Effect changes: zero out pilot values
 * that might otherwise bleed through (unused movement types, AC overrides, etc.).
 *
 * @returns {object[]}
 */
function buildFullyAuthoritativeChanges() {
  const OVERRIDE = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
  const P        = 125;

  return [
    // Zero out movement types the rig does not have
    { key: "system.attributes.movement.fly",    mode: OVERRIDE, value: "0",     priority: P },
    { key: "system.attributes.movement.swim",   mode: OVERRIDE, value: "0",     priority: P },
    { key: "system.attributes.movement.burrow", mode: OVERRIDE, value: "0",     priority: P },
    { key: "system.attributes.movement.hover",  mode: OVERRIDE, value: "false", priority: P },
    { key: "system.attributes.movement.units",  mode: OVERRIDE, value: "ft",    priority: P },
    { key: "system.attributes.movement.bonus",  mode: OVERRIDE, value: "0",     priority: P },

    // Clear AC formula/flat overrides (ac.calc already points to our custom type)
    { key: "system.attributes.ac.formula",      mode: OVERRIDE, value: "",      priority: P },
    { key: "system.attributes.ac.flat",         mode: OVERRIDE, value: "0",     priority: P },

    // Clear any temp-max modifier
    { key: "system.attributes.hp.tempmax",      mode: OVERRIDE, value: "0",     priority: P },
  ];
}

/**
 * Builds the full changes array for the Rig Stats Active Effect.
 * TODO: In Stage 10, fully-authoritative changes will be gated behind a world setting.
 *
 * @param {object} rigStats
 * @param {number} computedHpMax
 * @returns {object[]}
 */
function buildRigStatsChanges(rigStats, computedHpMax) {
  return [
    ...buildNecessaryChanges(rigStats, computedHpMax),
    ...buildFullyAuthoritativeChanges(),
  ];
}

// ---------------------------------------------------------------------------
// Start piloting
// ---------------------------------------------------------------------------

async function startPiloting(actor) {
  const isTitanic = actor.getFlag(MODULE_ID, FLAGS.IS_TITANIC) ?? false;
  const rigStats  = getRigStats(isTitanic);
  const rigHp     = actor.getFlag(MODULE_ID, FLAGS.RIG_HP) ?? 0;
  const computedHpMax = 5 + 5 * getArtificerLevel(actor);
  const rigImg    = actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_IMG_DEFAULT;

  // Capture the pilot's current AC before any overrides.
  // Stored in a dedicated flag so it is not mixed into the actor.update() stash.
  await actor.setFlag(MODULE_ID, FLAGS.PILOT_DISPLAY_AC, actor.system.attributes.ac.value);

  // Stash values that need manual restoration (img, hp.value) and values read
  // by the pilot section display in actor-sheet-hooks (abilities, hp.max).
  // Abilities, AC, movement, and traits are handled by the Rig Stats effect and
  // do NOT need stashing for restoration — deleting the effect restores them.
  const stash = {
    "img":                        actor.img,
    "prototypeToken.texture.src": actor.prototypeToken.texture.src,
    "system.abilities.str.value": actor.system.abilities.str.value,
    "system.abilities.dex.value": actor.system.abilities.dex.value,
    "system.abilities.con.value": actor.system.abilities.con.value,
    "system.attributes.hp.value": actor.system.attributes.hp.value,
    "system.attributes.hp.max":   actor.system.attributes.hp.max,
  };
  await actor.setFlag(MODULE_ID, FLAGS.VALUE_STASH, stash);

  // Create the Rig Stats Active Effect — handles abilities, hp.max, AC, movement,
  // and traits. Automatically restored when the effect is deleted on stop.
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name:     game.i18n.localize(`${MODULE_ID}.RigStatsEffectName`),
    img:      `modules/${MODULE_ID}/img/piloting-rig-effect.webp`,
    disabled: false,
    changes:  buildRigStatsChanges(rigStats, computedHpMax),
    flags:    { [MODULE_ID]: { [FLAGS.IS_RIG_STATS_EFFECT]: true } },
  }]);

  // Manually apply fields that effects cannot handle.
  await actor.update({
    "img":                        rigImg,
    "prototypeToken.texture.src": rigImg,
    "system.attributes.hp.value": rigHp,
  });

  // Update any tokens already placed on the canvas.
  const tokenUpdates = actor.getActiveTokens(false, true)
    .map(t => t.update({ "texture.src": rigImg }));
  await Promise.all(tokenUpdates);
}

// ---------------------------------------------------------------------------
// Stop piloting
// ---------------------------------------------------------------------------

async function stopPiloting(actor) {
  // Persist current rig HP before restoring actor stats.
  await actor.setFlag(MODULE_ID, FLAGS.RIG_HP, actor.system.attributes.hp.value);

  // Delete the Rig Stats effect — automatically restores abilities, hp.max, AC,
  // movement, and traits via the effect system.
  const rigStatsEffect = getRigStatsEffect(actor);
  if (rigStatsEffect) {
    await rigStatsEffect.delete();
  } else {
    console.warn(`${MODULE_ID} | stopPiloting: Rig Stats effect not found on actor ${actor.name}`);
  }

  const stash = actor.getFlag(MODULE_ID, FLAGS.VALUE_STASH);
  if (!stash) {
    console.warn(`${MODULE_ID} | stopPiloting: no stash found on actor ${actor.name}`);
    return;
  }

  // Manually restore fields that effects cannot handle.
  // Foundry expands dot-notation stash keys into nested objects on flag storage,
  // so read via nested paths.
  await actor.update({
    "img":                        stash.img,
    "prototypeToken.texture.src": stash.prototypeToken?.texture?.src,
    "system.attributes.hp.value": stash.system?.attributes?.hp?.value,
  });

  await actor.unsetFlag(MODULE_ID, FLAGS.VALUE_STASH);

  // Restore any tokens already placed on the canvas.
  // Read from prototypeToken after the update rather than from the stash.
  const restoredImg = actor.prototypeToken.texture.src;
  const tokenUpdates = actor.getActiveTokens(false, true)
    .map(t => t.update({ "texture.src": restoredImg }));
  await Promise.all(tokenUpdates);
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
