/**
 * The Rig Slam melee attack — source of truth for both the weapon item
 * created on the actor and the action text displayed on the Rig tab.
 */
export const RIG_SLAM = {
  name: "Slam",
  img: "icons/commodities/metal/mail-plate-steel.webp",
  description: "The Rig's built-in attack. Melee Weapon Attack: +4 (STR) + PB to hit, reach 5 ft., one target. Hit: 2d6 + 4 (STR) bludgeoning damage.",
  weapon: {
    type:          "natural",
    attackBonus:   "@prof.flat",   // +4 base is baked in via STR mod when piloting (STR 18 = +4)
    damage: {
      base: { number: 2, denomination: 6, type: "bludgeoning" },
    },
    properties:    [],
    weight:        { value: 0, units: "lb" },
    proficient:    1,
  },
};

/**
 * Hardcoded stat blocks for the Artificer's Rig and Titanic Rig.
 *
 * These values are never written to any Foundry document. They are used solely
 * to drive the Rig tab display and the stat override applied when an actor
 * enables their Piloting Rig Active Effect.
 *
 * Source: LaserLlama Alternate Artificer: Extended — Junker subclass.
 */

const STANDARD_RIG = {
  abilities: {
    str: 18,
    dex: 8,
    con: 16,
  },
  movement: {
    walk: 30,
    climb: 20,
  },
  ac: {
    formula: "10 + INT mod + PB",
  },
  hp: {
    formula: "5 + 5 \u00d7 Artificer level",
  },
  damageImmunities: ["poison", "psychic"],
  damageResistances: [],
  conditionImmunities: ["charmed", "exhausted", "poisoned"],
  damageReduction: {
    value: 3,
    bypass: ["acid", "force"],
  },
  features: [
    {
      name: "Inanimate",
      description:
        "The Rig is incapacitated without its Pilot. When it is forced to make an Intelligence, Wisdom, or Charisma ability check or saving throw, its Pilot is considered to be the target of the effect instead. Moreover, if the Pilot is concentrating on a spell when the Rig takes damage, the Pilot must make its Constitution saving throw to maintain concentration as if the Pilot had taken that damage.",
    },
    {
      name: "Ironsides",
      description:
        "When the Rig takes damage, it reduces the damage by its Constitution modifier (3). Acid and force damage bypass the effects of this feature.",
    },
    {
      name: "Siege Engine",
      description:
        "The Rig\u2019s weapon attacks and spells deal maximum possible damage, in place of rolling, when used on non-magical objects and structures.",
    },
  ],
  actions: [
    { name: RIG_SLAM.name, description: RIG_SLAM.description },
  ],
};

const TITANIC_RIG = {
  ...STANDARD_RIG,
  abilities: {
    str: 22,
    dex: 6,
    con: 19,
  },
  movement: {
    walk: 40,
    climb: 30,
  },
  damageResistances: ["bludgeoning", "piercing", "slashing"],
  features: [
    ...STANDARD_RIG.features,
    {
      name: "Immutable Form",
      description:
        "The Titanic Rig can choose to ignore any spell or effect that would alter or change its form.",
    },
  ],
  actions: [
    ...STANDARD_RIG.actions,
    {
      name: "Titanic Transformation",
      description:
        "The Titanic Rig becomes Huge in size, so long as there is room for it to grow. While it is Huge, its Slam attacks deal an additional 1d6 damage on hit, its reach increases by 5 ft., and it adds your INT to all Strength ability checks and saving throws. This transformation lasts for 1 minute. It ends early if the Titanic Rig is destroyed, or its Pilot uses their action to cause the Rig to revert to its normal form. The Titanic Rig can transform in this way once, and it regains the ability to do so at the following dawn. When it has no uses left, its Pilot can expend a 5th-level spell slot to use this transformation again.",
    },
  ],
};

/**
 * Returns the stat block for the given Rig variant.
 * @param {boolean} isTitanic - If true, returns the Titanic Rig stats.
 * @returns {object} The stat block object.
 */
export function getRigStats(isTitanic) {
  return isTitanic ? TITANIC_RIG : STANDARD_RIG;
}
