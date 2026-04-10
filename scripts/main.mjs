/**
 * LaserLlama Alternate Artificer - Junker
 *
 * Entry point. Imports and wires all module functionality.
 */

import { MODULE_ID, RIG_PILOT_SUBTYPE, RIG_ARMOR_CALC } from "./constants.mjs";
import { registerActorSheetHooks } from "./actor-sheet/actor-sheet-hooks.mjs";
import { registerClassFeatureHooks } from "./class-feature/class-feature-hooks.mjs";
import { registerPilotingHooks } from "./piloting/piloting-hooks.mjs";

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

  // World settings — control which piloting behaviours are active.
  game.settings.register(MODULE_ID, "artificerIdentifier", {
    name: game.i18n.localize(`${MODULE_ID}.SettingArtificerIdentifier`),
    hint: game.i18n.localize(`${MODULE_ID}.SettingArtificerIdentifierHint`),
    scope:   "world",
    config:  true,
    type:    String,
    default: "alternate-artificer",
  });
  game.settings.register(MODULE_ID, "applyRigStats", {
    name: game.i18n.localize(`${MODULE_ID}.SettingApplyRigStats`),
    hint: game.i18n.localize(`${MODULE_ID}.SettingApplyRigStatsHint`),
    scope:  "world",
    config: true,
    type:    Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, "fullyAuthoritativeStats", {
    name: game.i18n.localize(`${MODULE_ID}.SettingFullyAuthoritativeStats`),
    hint: game.i18n.localize(`${MODULE_ID}.SettingFullyAuthoritativeStatsHint`),
    scope:  "world",
    config: true,
    type:    Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, "resizeTokens", {
    name: game.i18n.localize(`${MODULE_ID}.SettingResizeTokens`),
    hint: game.i18n.localize(`${MODULE_ID}.SettingResizeTokensHint`),
    scope:  "world",
    config: true,
    type:    Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, "addRigFeatures", {
    name: game.i18n.localize(`${MODULE_ID}.SettingAddRigFeatures`),
    hint: game.i18n.localize(`${MODULE_ID}.SettingAddRigFeaturesHint`),
    scope:  "world",
    config: true,
    type:    Boolean,
    default: true,
  });

  registerActorSheetHooks();
  registerClassFeatureHooks();
  registerPilotingHooks();

  console.log(`${MODULE_ID} | Init complete`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});
