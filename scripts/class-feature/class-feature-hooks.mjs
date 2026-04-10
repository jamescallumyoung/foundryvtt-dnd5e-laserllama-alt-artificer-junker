import { MODULE_ID, FLAGS, RIG_PILOT_SUBTYPE, RIG_PILOTING_EFFECT_IMG_DEFAULT } from "../constants.mjs";
import { getPilotingEffect, getRigSlamItem, isPiloting } from "../helpers.mjs";
import { stopPiloting } from "../piloting/piloting-hooks.mjs";
import { RIG_SLAM } from "../rig-stats.mjs";

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
  
  // add "piloting rig" active effect
  if (!getPilotingEffect(actor)) {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: game.i18n.localize(`${MODULE_ID}.PilotingRigEffectName`),
      img: RIG_PILOTING_EFFECT_IMG_DEFAULT,
      disabled: true,
      changes: [],
      flags: { [MODULE_ID]: { [FLAGS.IS_PILOTING_RIG_EFFECT]: true } },
    }]);
  }
  
  // add "rig slam" weapon item
  if (!getRigSlamItem(actor)) {
    await actor.createEmbeddedDocuments("Item", [{
      name:   game.i18n.localize(`${MODULE_ID}.RigSlamWeaponName`),
      type:   "weapon",
      img:    RIG_SLAM.img,
      system: {
        description: { value: RIG_SLAM.description },
        ...RIG_SLAM.weapon,
      },
      flags: { [MODULE_ID]: { [FLAGS.IS_RIG_SLAM]: true } },
    }]);
  }
}

/**
 * Offers a checklist dialog to remove data associated with the Rig Pilot
 * feature from an actor. If the actor is currently piloting, stops piloting
 * first so the Rig Stats effect and rig feature items are cleaned up
 * automatically before the dialog is shown.
 *
 * @param {Actor} actor
 */
export async function cleanupRigData(actor) {
  if (isPiloting(actor)) await stopPiloting(actor);

  const effect   = getPilotingEffect(actor);
  const slamItem = getRigSlamItem(actor);
  const hasFlags = Object.keys(actor.flags?.[MODULE_ID] ?? {}).length > 0;

  if (!effect && !slamItem && !hasFlags) return;

  const rows = [];
  if (effect)   rows.push(`<label><input type="checkbox" name="effect" checked> ${game.i18n.localize(`${MODULE_ID}.CleanupEffectLabel`)}</label>`);
  if (slamItem) rows.push(`<label><input type="checkbox" name="slam" checked> ${game.i18n.localize(`${MODULE_ID}.CleanupSlamLabel`)}</label>`);
  if (hasFlags) rows.push(`<label><input type="checkbox" name="flags" checked> ${game.i18n.localize(`${MODULE_ID}.CleanupFlagsLabel`)}</label>`);

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize(`${MODULE_ID}.CleanupTitle`) },
    content: `
      <p>${game.i18n.localize(`${MODULE_ID}.CleanupContent`)}</p>
      <div style="display:flex;flex-direction:column;gap:0.25rem;margin-top:0.5rem">
        ${rows.join("\n        ")}
      </div>
    `,
    rejectClose: false,
    modal: true,
    buttons: [
      {
        label:  game.i18n.localize(`${MODULE_ID}.CleanupCancel`),
        action: "cancel",
      },
      {
        label:    game.i18n.localize(`${MODULE_ID}.CleanupConfirm`),
        action:   "confirm",
        callback: (_event, _button, dialog) => ({
          effect: dialog.element.querySelector('[name="effect"]')?.checked ?? false,
          slam:   dialog.element.querySelector('[name="slam"]')?.checked ?? false,
          flags:  dialog.element.querySelector('[name="flags"]')?.checked ?? false,
        }),
      },
    ],
  });

  if (!result || result === "cancel") return;

  if (result.effect && effect)   await effect.delete();
  if (result.slam   && slamItem) await slamItem.delete();
  if (result.flags)              await actor.update({ [`flags.${MODULE_ID}`]: null });
}

/**
 * When the Rig Pilot item is removed from an actor, offer to clean up
 * associated data via a checklist dialog.
 */
async function onDeleteItem(item, _options, userId) {
  if (userId !== game.userId) return;
  if (!isRigPilotItem(item)) return;

  const actor = item.parent;
  if (!actor) return;

  await cleanupRigData(actor);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerClassFeatureHooks() {
  Hooks.on("createItem", onCreateItem);
  Hooks.on("deleteItem", onDeleteItem);
}
