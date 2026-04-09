import { MODULE_ID, FLAGS, RIG_PILOT_SUBTYPE, RIG_PILOTING_EFFECT_IMG_DEFAULT } from "../constants.mjs";
import { getPilotingEffect } from "../helpers.mjs";

/**
 * Returns true if this item is a Rig Pilot class feature.
 *
 * @param {Item} item
 * @returns {boolean}
 */
function isRigPilotItem(item) {
  return (
    item.type === "feat" &&
    item.system?.type?.value === "class" &&
    item.system?.type?.subtype === RIG_PILOT_SUBTYPE
  );
}

/**
 * When a Rig Pilot item is added to an actor, auto-create a disabled
 * "Piloting Rig" Active Effect on the same actor. Guarded against duplicates.
 */
async function onCreateItem(item, _options, userId) {
  if (userId !== game.userId) return;
  if (!isRigPilotItem(item)) return;

  const actor = item.parent;
  if (!actor) return;
  if (getPilotingEffect(actor)) return; // already exists

  await actor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: game.i18n.localize(`${MODULE_ID}.PilotingRigEffectName`),
      img: RIG_PILOTING_EFFECT_IMG_DEFAULT,
      disabled: true,
      changes: [],
      flags: { [MODULE_ID]: { [FLAGS.IS_PILOTING_RIG_EFFECT]: true } },
    },
  ]);
}

/**
 * When the Rig Pilot item is removed from an actor, delete the associated
 * Piloting Rig Active Effect if one exists.
 */
async function onDeleteItem(item, _options, userId) {
  if (userId !== game.userId) return;
  if (!isRigPilotItem(item)) return;

  const actor = item.parent;
  if (!actor) return;

  const effect = getPilotingEffect(actor);
  if (!effect) return;

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize(`${MODULE_ID}.DeleteEffectTitle`) },
    content: `<p>${game.i18n.localize(`${MODULE_ID}.DeleteEffectContent`)}</p>`,
  });
  if (confirmed) await effect.delete();
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerClassFeatureHooks() {
  Hooks.on("createItem", onCreateItem);
  Hooks.on("deleteItem", onDeleteItem);
}
