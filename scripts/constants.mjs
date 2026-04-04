export const MODULE_ID = "laserllama-alt-artificer-junker";

export const FLAGS = {
  IS_TITANIC:             "isTitanic",          // boolean — which stat block variant to show/use
  RIG_HP:                 "rigHp",              // number  — stored current HP of the Rig
  VALUE_STASH:            "rigActorValueStash",  // object  — actor stats saved before piloting
  IS_PILOTING_RIG_EFFECT: "isPilotingRigEffect"  // boolean — marks the Piloting Rig ActiveEffect
};

export const RIG_PILOT_TYPE = `${MODULE_ID}.rigPilot`;
