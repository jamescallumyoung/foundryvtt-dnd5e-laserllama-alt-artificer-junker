/**
 * LaserLlama Alternate Artificer - Junker
 *
 * Entry point. Imports and wires all module functionality.
 */

import { MODULE_ID, RIG_PILOT_TYPE } from "./constants.mjs";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Init complete`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});
