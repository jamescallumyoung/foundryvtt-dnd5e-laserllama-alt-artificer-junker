/**
 * LaserLlama Alternate Artificer - Junker
 *
 * Entry point. Imports and wires all module functionality.
 */

import { MODULE_ID, RIG_PILOT_SUBTYPE } from "./constants.mjs";

Hooks.once("init", () => {
  // Register "Rig Pilot" as a class feature subtype in the dnd5e system.
  game.dnd5e.config.featureTypes.class.subtypes[RIG_PILOT_SUBTYPE] =
    game.i18n.localize(`${MODULE_ID}.RigPilotSubtype`);

  console.log(`${MODULE_ID} | Init complete`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});