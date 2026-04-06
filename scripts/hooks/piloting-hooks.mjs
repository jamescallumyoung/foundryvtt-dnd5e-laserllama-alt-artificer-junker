import { MODULE_ID, FLAGS, RIG_PILOT_SUBTYPE, RIG_ARMOR_CALC, RIG_IMG_DEFAULT } from "../constants.mjs";
import { getPilotingEffect, getArtificerLevel } from "../helpers.mjs";
import { getRigStats } from "../rig-stats.mjs";

// ---------------------------------------------------------------------------
// Piloting Rig effect lifecycle
// ---------------------------------------------------------------------------

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
      img: `modules/${MODULE_ID}/img/piloting-rig-effect.webp`,
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
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stat override — toggle handler
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
// Stat override — start
// ---------------------------------------------------------------------------

async function startPiloting(actor) {
  const isTitanic = actor.getFlag(MODULE_ID, FLAGS.IS_TITANIC) ?? false;
  const rigStats  = getRigStats(isTitanic);
  const rigHp     = actor.getFlag(MODULE_ID, FLAGS.RIG_HP) ?? 0;
  const computedHpMax = 5 + 5 * getArtificerLevel(actor);
  const rigImg    = actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_IMG_DEFAULT;

  // Build stash — capture exact current values before we overwrite anything.
  const mv = actor.system.attributes.movement;
  const stash = {
    // Portrait + token image
    "img":                        actor.img,
    "prototypeToken.texture.src": actor.prototypeToken.texture.src,

    // Pre-piloting computed AC value (stored with a simple key, not dot-notation,
    // so Foundry's flag expansion doesn't nest it and it can be read back directly).
    "pilotAC": actor.system.attributes.ac.value,

    // Abilities
    "system.abilities.str.value": actor.system.abilities.str.value,
    "system.abilities.dex.value": actor.system.abilities.dex.value,
    "system.abilities.con.value": actor.system.abilities.con.value,

    // HP
    "system.attributes.hp.value":   actor.system.attributes.hp.value,
    "system.attributes.hp.max":     actor.system.attributes.hp.max,     // null = system-derived
    "system.attributes.hp.tempmax": actor.system.attributes.hp.tempmax, // null = not set

    // AC
    "system.attributes.ac.calc":    actor.system.attributes.ac.calc,
    "system.attributes.ac.formula": actor.system.attributes.ac.formula,
    "system.attributes.ac.flat":    actor.system.attributes.ac.flat,

    // Movement — stash exact raw values (0 !== null)
    "system.attributes.movement.walk":                  mv.walk,
    "system.attributes.movement.climb":                 mv.climb,
    "system.attributes.movement.burrow":                mv.burrow,
    "system.attributes.movement.fly":                   mv.fly,
    "system.attributes.movement.swim":                  mv.swim,
    "system.attributes.movement.hover":                 mv.hover,
    "system.attributes.movement.units":                 mv.units,
    "system.attributes.movement.bonus":                 mv.bonus,
    "system.attributes.movement.ignoredDifficultTerrain": mv.ignoredDifficultTerrain,

    // Traits — stash as arrays (dnd5e stores as Sets internally)
    "system.traits.di.value": Array.from(actor.system.traits.di.value),
    "system.traits.dr.value": Array.from(actor.system.traits.dr.value),
    "system.traits.ci.value": Array.from(actor.system.traits.ci.value),
  };

  await actor.setFlag(MODULE_ID, FLAGS.VALUE_STASH, stash);

  await actor.update({
    // Portrait + prototype token image
    "img":                        rigImg,
    "prototypeToken.texture.src": rigImg,

    // Abilities
    "system.abilities.str.value": rigStats.abilities.str,
    "system.abilities.dex.value": rigStats.abilities.dex,
    "system.abilities.con.value": rigStats.abilities.con,

    // HP
    "system.attributes.hp.value":   rigHp,
    "system.attributes.hp.max":     computedHpMax,
    "system.attributes.hp.tempmax": null,

    // AC — set calc to our registered type; formula/flat are unused by it
    "system.attributes.ac.calc": RIG_ARMOR_CALC,

    // Movement
    "system.attributes.movement.walk":                  rigStats.movement.walk,
    "system.attributes.movement.climb":                 rigStats.movement.climb,
    "system.attributes.movement.burrow":                0,
    "system.attributes.movement.fly":                   0,
    "system.attributes.movement.swim":                  0,
    "system.attributes.movement.hover":                 false,
    "system.attributes.movement.units":                 "ft",
    "system.attributes.movement.bonus":                 0,
    "system.attributes.movement.ignoredDifficultTerrain": null,

    // Traits
    "system.traits.di.value": rigStats.damageImmunities,
    "system.traits.dr.value": rigStats.damageResistances,
    "system.traits.ci.value": rigStats.conditionImmunities,
  });

  // Update any tokens already placed on the canvas.
  const tokenUpdates = actor.getActiveTokens(false, true)
    .map(t => t.update({ "texture.src": rigImg }));
  await Promise.all(tokenUpdates);
}

// ---------------------------------------------------------------------------
// Stat override — stop
// ---------------------------------------------------------------------------

async function stopPiloting(actor) {
  // Persist current rig HP before restoring actor stats.
  await actor.setFlag(MODULE_ID, FLAGS.RIG_HP, actor.system.attributes.hp.value);

  const stash = actor.getFlag(MODULE_ID, FLAGS.VALUE_STASH);
  if (!stash) {
    console.warn(`${MODULE_ID} | stopPiloting: no stash found on actor ${actor.name}`);
    return;
  }

  await actor.update(stash);
  await actor.unsetFlag(MODULE_ID, FLAGS.VALUE_STASH);

  // Restore any tokens already placed on the canvas.
  // Read from actor.prototypeToken after the update to avoid dot-key expansion
  // issues with stash flag retrieval.
  const restoredImg = actor.prototypeToken.texture.src;
  const tokenUpdates = actor.getActiveTokens(false, true)
    .map(t => t.update({ "texture.src": restoredImg }));
  await Promise.all(tokenUpdates);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerPilotingHooks() {
  Hooks.on("createItem", onCreateItem);
  Hooks.on("deleteItem", onDeleteItem);
  Hooks.on("updateActiveEffect", onUpdateActiveEffect);
}
