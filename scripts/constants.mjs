export const MODULE_ID = "laserllama-alt-artificer-junker";

export const FLAGS = {
  IS_TITANIC:             "isTitanic",          // boolean — which stat block variant to show/use
  RIG_HP:                 "rigHp",              // number  — stored current HP of the Rig
  VALUE_STASH:            "rigActorValueStash",  // object  — actor stats saved before piloting
  IS_PILOTING_RIG_EFFECT: "isPilotingRigEffect", // boolean — marks the Piloting Rig ActiveEffect
  RIG_IMG:                "rigImg",             // string  — image path for the Rig portrait
  PILOT_DISPLAY_AC:       "pilotDisplayAC",     // number  — pilot's pre-piloting AC for display
};

export const RIG_IMG_DEFAULT = "icons/svg/shield.svg";

/**
 * The key used to register our custom AC calculation type in CONFIG.DND5E.armorClasses.
 * When piloting, the actor's ac.calc is set to this value so dnd5e evaluates
 * the formula "10 + @abilities.int.mod + @attributes.prof" for the Rig's AC.
 */
export const RIG_ARMOR_CALC = "rigArmor";

/**
 * The key of the class feature subtype registered on game.dnd5e.config.featureTypes.class.subtypes.
 * A "Rig Pilot" item is a standard dnd5e feat-type item with type.value = "class"
 * and type.subtype = RIG_PILOT_SUBTYPE.
 *
 * Note: featureTypes subtypes have no automatic namespacing, so we manually
 * prefix with the module ID to avoid collisions with other modules.
 */
export const RIG_PILOT_SUBTYPE = `${MODULE_ID}.rigPilot`;
