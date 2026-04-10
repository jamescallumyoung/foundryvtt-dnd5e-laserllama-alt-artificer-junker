import { MODULE_ID, EFFECT_PRIORITY, FLAGS } from "../constants.mjs";

// All damage types that Ironsides reduces. Acid and force bypass the feature and are not included.
const IRONSIDES_DAMAGE_TYPES = [
  "bludgeoning", "cold", "fire", "lightning", "necrotic",
  "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
];

/**
 * Builds the embedded ActiveEffect for the Ironsides feature.
 * Reduces all incoming damage (except acid and force) by the rig's CON modifier,
 * using dnd5e's built-in damage modification (dm.amount) system.
 * The formula "-@abilities.con.mod" is evaluated against the actor's roll data,
 * which reflects the rig's CON after the Rig Stats effect has applied.
 *
 * @returns {object}
 */
function buildIronsidesEffect() {
  const ADD = CONST.ACTIVE_EFFECT_MODES.ADD;
  return {
    name:     "Ironsides",
    img:      "icons/svg/tower.svg",
    transfer: true,
    changes:  IRONSIDES_DAMAGE_TYPES.map(type => ({
      key:      `system.traits.dm.amount.${type}`,
      mode:     ADD,
      value:    "-@abilities.con.mod",
      priority: EFFECT_PRIORITY,
    })),
  };
}

/**
 * Creates all rig feature and action items on the actor for the duration of
 * piloting. Each item is tagged with IS_RIG_FEATURE so it can be found and
 * deleted when piloting ends.
 *
 * @param {Actor} actor
 * @param {object} rigStats  Stat block from getRigStats().
 */
export async function addRigFeatures(actor, rigStats) {
  const flagData = { [MODULE_ID]: { [FLAGS.IS_RIG_FEATURE]: true } };

  const itemData = [
    ...rigStats.features.map(f => ({
      name:   f.name,
      type:   "feat",
      system: {
        description:  { value: f.description },
        type:         { value: "class" },
        requirements: "Rig Pilot",
      },
      effects: f.name === "Ironsides" ? [buildIronsidesEffect()] : [],
      flags:   flagData,
    })),
    ...rigStats.actions.map(a => ({
      name:   a.name,
      type:   "feat",
      system: {
        description:  { value: a.description },
        type:         { value: "class" },
        requirements: "Rig Pilot",
      },
      flags: flagData,
    })),
  ];

  await actor.createEmbeddedDocuments("Item", itemData);
}

/**
 * Deletes all items on the actor that were added during piloting (identified
 * by the IS_RIG_FEATURE flag).
 *
 * @param {Actor} actor
 */
export async function removeRigFeatures(actor) {
  const ids = actor.items
    .filter(i => i.flags?.[MODULE_ID]?.[FLAGS.IS_RIG_FEATURE] === true)
    .map(i => i.id);

  if (ids.length > 0) await actor.deleteEmbeddedDocuments("Item", ids);
}
