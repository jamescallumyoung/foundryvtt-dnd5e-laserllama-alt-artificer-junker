/**
 * LaserLlama Alternate Artificer - Junker
 *
 * Entry point. Imports and wires all module functionality.
 */

import { MODULE_ID, RIG_PILOT_SUBTYPE, RIG_ARMOR_CALC } from "./constants.mjs";
import { registerActorSheetHooks } from "./hooks/actor-sheet-hooks.mjs";
import { registerPilotingHooks } from "./hooks/piloting-hooks.mjs";

Hooks.once("init", () => {
  // Register "Rig Pilot" as a class feature subtype in the dnd5e system.
  // This makes the item appear as a class feature with subtype "Rig Pilot"
  // in the item creation dialog, matching the same pattern as dnd5e-spellpoints.
  game.dnd5e.config.featureTypes.class.subtypes[RIG_PILOT_SUBTYPE] =
    game.i18n.localize(`${MODULE_ID}.RigPilotSubtype`);

  // Register "Rig Armor" armor calculation preset in the dnd5e system.
  // This provides a preset formula that is used when calculating the rig's AC.
  // By providing a preset formula, we make applying the AC easier and also
  // allow users to access this formula directly in their own items and effects.
  CONFIG.DND5E.armorClasses[RIG_ARMOR_CALC] = {
    label: game.i18n.localize(`${MODULE_ID}.ArmorClassRigLabel`),
    // @prof.flat = flat numeric proficiency bonus (plain number, safe for arithmetic).
    // @attributes.prof resolves to the Proficiency object in v5 rollData and would
    // cause a formula parse error, falling back to the default equipped-armor formula.
    formula: "10 + @abilities.int.mod + @prof.flat",
  };

  registerActorSheetHooks();
  registerPilotingHooks();

  console.log(`${MODULE_ID} | Init complete`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});
