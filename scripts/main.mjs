/**
 * LaserLlama Alternate Artificer - Junker
 *
 * Entry point. Imports and wires all module functionality.
 */

import { MODULE_ID, RIG_PILOT_SUBTYPE } from "./constants.mjs";
import { registerActorSheetHooks } from "./hooks/actor-sheet-hooks.mjs";
// Stage 4: import { registerPilotingHooks } from "./hooks/piloting-hooks.mjs";

Hooks.once("init", () => {
  // Register "Rig Pilot" as a class feature subtype in the dnd5e system.
  // This makes the item appear as a class feature with subtype "Rig Pilot"
  // in the item creation dialog, matching the same pattern as dnd5e-spellpoints.
  game.dnd5e.config.featureTypes.class.subtypes[RIG_PILOT_SUBTYPE] =
    game.i18n.localize(`${MODULE_ID}.RigPilotSubtype`);

  registerActorSheetHooks();
  // Stage 4: registerPilotingHooks();

  console.log(`${MODULE_ID} | Init complete`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});
