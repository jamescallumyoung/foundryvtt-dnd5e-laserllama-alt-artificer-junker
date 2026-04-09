import { MODULE_ID, FLAGS } from "../constants.mjs";

export async function stashAndUpdate(actor, rigHp, rigImg) {
  // Capture the pilot's current AC before any overrides.
  // Stored in a dedicated flag so it is not mixed into the actor.update() stash.
  await actor.setFlag(MODULE_ID, FLAGS.PILOT_DISPLAY_AC, actor.system.attributes.ac.value);

  // Stash values that need manual restoration (img, token size, hp.value) and
  // values read by the pilot section display in actor-sheet-hooks (abilities, hp.max).
  // Abilities, AC, movement, and traits are handled by the Rig Stats effect and
  // do NOT need stashing for restoration — deleting the effect restores them.
  const stash = {
    // need to be restored
    "img":                        actor.img,
    "prototypeToken.texture.src": actor.prototypeToken.texture.src,
    "prototypeToken.width":       actor.prototypeToken.width,
    "prototypeToken.height":      actor.prototypeToken.height,
    "system.attributes.hp.value": actor.system.attributes.hp.value,

    // just shown in pilot stat block section of rig tab
    "system.abilities.str.value": actor.system.abilities.str.value,
    "system.abilities.dex.value": actor.system.abilities.dex.value,
    "system.abilities.con.value": actor.system.abilities.con.value,
    "system.attributes.hp.max":   actor.system.attributes.hp.max,
  };
  await actor.setFlag(MODULE_ID, FLAGS.VALUE_STASH, stash);

  // Apply all fields that effects cannot handle in a single update.
  await actor.update({
    "img":                        rigImg,
    "prototypeToken.texture.src": rigImg,
    "prototypeToken.width":       2,
    "prototypeToken.height":      2,
    "system.attributes.hp.value": rigHp,
  });

  // Update placed canvas tokens once, combining image and size.
  const tokenUpdates = actor.getActiveTokens(false, true)
    .map(t => t.update({ "texture.src": rigImg, width: 2, height: 2 }));
  await Promise.all(tokenUpdates);
}

export async function unstashAndRestore(actor) {
  const stash = actor.getFlag(MODULE_ID, FLAGS.VALUE_STASH);
  if (!stash) {
    console.warn(`${MODULE_ID} | stopPiloting: no stash found on actor ${actor.name}`);
    return;
  }

  // Restore all manually-managed fields in a single update.
  // Foundry expands dot-notation stash keys into nested objects on flag storage,
  // so read via nested paths.
  await actor.update({
    "img":                        stash.img,
    "prototypeToken.texture.src": stash.prototypeToken?.texture?.src,
    "prototypeToken.width":       stash.prototypeToken?.width,
    "prototypeToken.height":      stash.prototypeToken?.height,
    "system.attributes.hp.value": stash.system?.attributes?.hp?.value,
  });

  await actor.unsetFlag(MODULE_ID, FLAGS.VALUE_STASH);

  // Restore placed canvas tokens once, combining image and size.
  // Read from prototypeToken after the update rather than from the stash.
  const proto = actor.prototypeToken;
  const tokenUpdates = actor.getActiveTokens(false, true)
    .map(t => t.update({ "texture.src": proto.texture.src, width: proto.width, height: proto.height }));
  await Promise.all(tokenUpdates);
}
