import { MODULE_ID, FLAGS, RIG_PILOT_SUBTYPE } from "./constants.mjs";

/**
 * Returns the actor's Artificer class level, or 0 if not found.
 *
 * @param {Actor} actor
 * @returns {number}
 */
export function getArtificerLevel(actor) {
  return (
    Object.values(actor.classes ?? {}).find(
      (c) => c.system.identifier === "artificer"
    )?.system.levels ?? 0
  );
}

/**
 * Returns the Rig Pilot class feature item from the actor's inventory, or null.
 * The Rig Pilot item is a standard dnd5e feat-type item (class feature subtype).
 *
 * @param {Actor} actor
 * @returns {Item|null}
 */
export function getRigPilotItem(actor) {
  return (
    actor?.items?.find(
      (i) =>
        i.type === "feat" &&
        i.system?.type?.value === "class" &&
        i.system?.type?.subtype === RIG_PILOT_SUBTYPE
    ) ?? null
  );
}

/**
 * Returns the "Piloting Rig" Active Effect from the actor, or null.
 * Detection is by flag, not by name, so it is locale-independent.
 *
 * @param {Actor} actor
 * @returns {ActiveEffect|null}
 */
export function getPilotingEffect(actor) {
  return (
    actor?.effects?.find(
      (e) => e.flags?.[MODULE_ID]?.[FLAGS.IS_PILOTING_RIG_EFFECT] === true
    ) ?? null
  );
}

/**
 * Returns true if the actor currently has the Piloting Rig effect enabled.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isPiloting(actor) {
  const effect = getPilotingEffect(actor);
  return effect != null && !effect.disabled;
}
