// Fns relating to the "Rig Stats" active effect.
// This effect is added when entering piloting mode, and destroyed when exiting.
// The effect handles most stat changes to the actor.

import { MODULE_ID, FLAGS, EFFECT_PRIORITY, RIG_ARMOR_CALC } from "../constants.mjs";
import { getRigStatsEffect } from "../helpers.mjs";

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
  const P        = EFFECT_PRIORITY;

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
  const P        = EFFECT_PRIORITY;

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

/**
 * Create the "Rig Stats" active effect on the actor.
 */
export async function createRigStatsActiveEffect(actor, rigStats, computedHpMax, effectImg) {
    // Create the Rig Stats Active Effect — handles abilities, hp.max, AC, movement,
    // and traits. Automatically restored when the effect is deleted on stop.
    await actor.createEmbeddedDocuments("ActiveEffect", [{
        name:     game.i18n.localize(`${MODULE_ID}.RigStatsEffectName`),
        img:      effectImg,
        disabled: false,
        changes:  buildRigStatsChanges(rigStats, computedHpMax),
        flags:    { [MODULE_ID]: { [FLAGS.IS_RIG_STATS_EFFECT]: true } },
    }]);
}

/**
 * Remove the "Rig Stats" active effect on the actor.
 */
export async function removeRigStatsActiveEffect(actor) {
  // Delete the Rig Stats effect — automatically restores abilities, hp.max, AC,
  // movement, and traits via the effect system.
  const rigStatsEffect = getRigStatsEffect(actor);
  if (rigStatsEffect) {
    await rigStatsEffect.delete();
  } else {
    console.warn(`${MODULE_ID} | stopPiloting: Rig Stats effect not found on actor ${actor.name}`);
  }
}