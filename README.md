# LaserLlama Alternate Artificer — Junker

A [FoundryVTT](https://foundryvtt.com/) module for the [dnd5e](https://github.com/foundryvtt/dnd5e) system that implements support for the **Junker** subclass from LaserLlama's Alternate Artificer class.

This module adds support for piloting a Rig — a large mechanical construct that replaces the pilot's stats and abilities while active.

## Requirements

- FoundryVTT v13+
- dnd5e system v5.1.0+

## Installation

Install via FoundryVTT's *Install Module* dialog by pasting the following manifest URL:

```
https://github.com/jamescallumyoung/foundryvtt-dnd5e-laserllama-alt-artificer-junker/releases/latest/download/module.json
```

## Features

All features are gated behind a **Rig Pilot class feature**.
Add the class feature to a player character or NPC to enable the following features.
Without the class feature, this module does nothing, so it will not bork any of your other actors.

- **Rig Tag** — a dedicated Rig tab is added to the character sheet that shows Rig details.
- **Piloting mode** — toggling the *Piloting Rig* active effect on an actor triggers the full piloting start/stop sequence.
- **Rig Stats effect** — in piloting mode, a *Rig Stats* active effect is created on the actor that overrides stats with the rig's values. Removed automatically when piloting ends.
- **Rig Armor AC formula** — registers a custom `Rig Armor` AC calculation preset (`10 + INT mod + proficiency bonus`) for use on rig actors.
- **Token resizing** — when piloting starts, the actor's token is resized to Large (2×2). Restored to its original size when piloting ends.
- **Rig features** — the rig's features and actions are added to the actor's item list while piloting and removed when piloting ends. A *Rig Slam* melee weapon is also added to the actor.
- **Cleanup dialog** — when the _Rig Pilot_ class feature is removed from an actor, an optional cleanup dialog allows the player to remove leftover data.
- **Macro API** — individual piloting sub-behaviors are exposed on `game.modules.get("laserllama-alt-artificer-junker").api` for use in macros.

## How to use the module

### Setup

Add the Rig Pilot class feature to a player character or NPC to enable the module's features for that actor. 

Toggle the "Rig Stats" effect on/off to enable piloting mode. I suggest adding the effect to your macro hotbar, and to the actor's favourite actions menu.

### Modifying the Rig

Since the Rig's stats are dynamically generated, you cannot just edit the character's stats when in piloting mode. Any changes made to the actor whist in piloting mode will be lost upon exiting the mode.

To edit the Rig's stats, you can add effects to the _Piloting Rig_ active effect.

You can modify the Rig's slam attack by modifying the _Rig Slam_ weapon.

Changes made to _Piloting Rig_ and _Rig Slam_ will be preserved when entering/exiting piloting mode.

### Removing features from an actor

Simply delete the _Rig Pilot_ class feature from an actor to trigger the clean up dialog.
You can select which data to remove and which to retain when using the dialog.

The clean up dialog can also be triggered programatically using the added API function.

### Uninstalling the module

It is recommended to remove the _Rig Pilot_ class feature from all actors before uninstalling the module. Doing so will allow you to use the built-in clean up dialog.

If you forget to remove the  _Rig Pilot_ class feature before uninstalling the module, be sure to manually remove:

- the _Piloting Rig_ and _Rig Stats_ active effects,
- and the _Rig Slam_ weapon.

You may also want to change the actor's character and token art, and token size.

## Module Settings

All behaviors can be toggled on a per-world basis in the module settings:

| Setting | Description | Default |
|---|---|---|
| Artificer Class Identifier | The "class identifier" used to locate the Artificer class on the actor. This allows you to specify any class as the "artificer class" used to calculate some of the rig's stats. | `alternate-artificer` |
| Apply Rig Stats | Create the Rig Stats active effect when piloting starts. Disable if you want to manually manage the actor's stats. | `true` |
| Fully Authoritative Rig Stats | Zero out pilot values that might bleed through (requires Apply Rig Stats). Disable if you want to retain some of the actor's own stats or other active effects when in piloting mode. | `true` |
| Resize Tokens When Piloting | Resize the actor's token to Large while piloting. | `true` |
| Add Rig Features When Piloting | Add the rig's features and actions to the actor while piloting. | `true` |

## Macro API

The following functions are available for use in macros:

```js
const api = `game.modules.get("laserllama-alt-artificer-junker").api`;

// rig stats
api.applyRigStats(actor, [fullyAuthorative=true])
api.removeRigStats(actor)


// trigger the clean up dialog
api.cleanupRigData(actor)
```

API functions ignore world setting toggles.

## License

MIT License. See [LICENSE.md](./LICENSE.md).

Original class and subclass designs by LaserLlama.

## AI Notice

This module was written by actual humans but AI tools may (and likely will) have been used by contributors.

Commits to this repo must not be "AI slop" or "vibe-coded"; all commits must be reviewed by an actual human and a human must play a significant part (beyond prompting) in the creation of any changes.
