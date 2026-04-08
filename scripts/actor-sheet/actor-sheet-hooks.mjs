import { MODULE_ID, FLAGS, RIG_IMG_DEFAULT } from "../constants.mjs";
import { getRigPilotItem, isPiloting, getArtificerLevel } from "../helpers.mjs";
import { getRigStats } from "../rig-stats.mjs";
import { setupRigTab } from "./setup-rig-tab.mjs";

// ---------------------------------------------------------------------------
// Handlebars helpers
// ---------------------------------------------------------------------------

Handlebars.registerHelper("abilityMod", (score) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
});

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

/**
 * Builds the template context object for the Rig tab.
 *
 * @param {Actor} actor
 * @param {Application} app
 * @returns {object}
 */
function buildRigTabContext(actor, app) {
  const isTitanic = actor.getFlag(MODULE_ID, FLAGS.IS_TITANIC) ?? false;
  const rigStats = getRigStats(isTitanic);
  const piloting = isPiloting(actor);
  const artificerLevel = getArtificerLevel(actor);

  const rigHp = piloting
    ? actor.system.attributes.hp.value
    : (actor.getFlag(MODULE_ID, FLAGS.RIG_HP) ?? 0);
  const computedHpMax = 5 + 5 * artificerLevel;
  const isEditable = app.isEditable && app._mode === 2;

  // Pilot section — when piloting, read pre-override values from the expanded stash.
  // Foundry expands dot-notation keys stored in flags, so access via nested paths.
  let pilotImg, pilotAC, pilotStr, pilotDex, pilotCon, pilotHp, pilotHpMax;
  if (piloting) {
    const stash = actor.getFlag(MODULE_ID, FLAGS.VALUE_STASH);
    pilotImg   = stash?.img ?? actor.img;
    pilotAC    = actor.getFlag(MODULE_ID, FLAGS.PILOT_DISPLAY_AC) ?? 0;
    pilotStr   = stash?.system?.abilities?.str?.value ?? 10;
    pilotDex   = stash?.system?.abilities?.dex?.value ?? 10;
    pilotCon   = stash?.system?.abilities?.con?.value ?? 10;
    pilotHp    = stash?.system?.attributes?.hp?.value ?? 0;
    pilotHpMax = stash?.system?.attributes?.hp?.max ?? 0;
  } else {
    pilotImg   = actor.img;
    pilotAC    = actor.system.attributes.ac.value ?? 10;
    pilotStr   = actor.system.abilities.str.value;
    pilotDex   = actor.system.abilities.dex.value;
    pilotCon   = actor.system.abilities.con.value;
    pilotHp    = actor.system.attributes.hp.value ?? 0;
    pilotHpMax = actor.system.attributes.hp.max ?? 0;
  }

  return {
    isTitanic,
    rigStats,
    // Match dnd5e's own context.editable: requires both ownership AND edit mode.
    // app.isEditable alone is permission-only (always true for the owner).
    isEditable,
    isPiloting: piloting,
    rigHp,
    computedAC:
      10 +
      (actor.system.abilities.int.mod ?? 0) +
      (actor.system.attributes.prof ?? 0),
    computedHpMax,
    hpPct: computedHpMax > 0 ? Math.round((rigHp / computedHpMax) * 100) : 0,
    rigImg: actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_IMG_DEFAULT,
    // Pilot section
    pilotImg,
    pilotAC,
    pilotStr,
    pilotDex,
    pilotCon,
    pilotHp,
    pilotHpMax,
    pilotHpPct: pilotHpMax > 0 ? Math.round((pilotHp / pilotHpMax) * 100) : 0,
    // Edit mode for pilot portrait: only allow changing the actor portrait when not piloting,
    // since actor.img is the rig image while piloting.
    pilotEditable: isEditable && !piloting,
  };
}

// ---------------------------------------------------------------------------
// Stats section wiring
// ---------------------------------------------------------------------------

/**
 * Wires portrait click, AC badge tooltip, and HP bar editing for one stats section.
 *
 * @param {HTMLElement} sectionEl  Root of the section; all queries are scoped within it.
 * @param {object}      opts
 * @param {() => string}                           opts.getImg         Current portrait src.
 * @param {((path: string) => void)|null}          opts.onImgEdit      FilePicker callback;
 *                                                                     null = portrait is read-only
 *                                                                     (shows ImagePopout instead).
 * @param {string}                                 opts.imgTitle       Pre-localized ImagePopout title.
 * @param {string}                                 opts.uuid           Actor UUID for ImagePopout.
 * @param {() => string}                           opts.buildAcTooltip Returns inner HTML for tooltip.
 * @param {() => number}                           opts.getHp          Current HP (used as edit baseline).
 * @param {() => number}                           opts.getHpMax       Max HP (used for clamping).
 * @param {((next: number) => Promise<void>)|null} opts.onHpCommit     Commit callback;
 *                                                                     null = HP bar is read-only.
 */
function wireStatsSection(sectionEl, { getImg, onImgEdit, imgTitle, uuid, buildAcTooltip, getHp, getHpMax, onHpCommit }) {
  // --- Portrait ---
  const portrait = sectionEl.querySelector(".stats-portrait");
  if (portrait) {
    portrait.addEventListener("click", () => {
      const current = getImg();
      if (onImgEdit) {
        new FilePicker({ type: "image", current, callback: onImgEdit }).render(true);
      } else {
        new ImagePopout(current, { title: imgTitle, uuid }).render(true);
      }
    });
  }

  // --- AC badge tooltip ---
  const acBadge = sectionEl.querySelector(".ac-badge");
  if (acBadge) {
    acBadge.addEventListener("mouseenter", () => {
      game.tooltip.activate(acBadge, {
        direction: "DOWN",
        cssClass: "property-attribution",
        text: game.i18n.localize("DND5E.ArmorClass"), // prevents rendering "undefined"
      });
      document.getElementById("tooltip")?.replaceChildren(
        document.createRange().createContextualFragment(buildAcTooltip())
      );
    });
    acBadge.addEventListener("mouseleave", () => game.tooltip.deactivate());
  }

  // --- HP bar ---
  if (!onHpCommit) return; // read-only; no editing to wire up

  const hpMeter = sectionEl.querySelector(".meter.hit-points");
  const hpLabel = hpMeter?.querySelector(".progress .label");
  const hpInput = hpMeter?.querySelector(".stats-hp-input");
  if (!hpMeter || !hpLabel || !hpInput) return;

  hpMeter.addEventListener("click", () => {
    hpInput.value = String(getHp());
    hpLabel.hidden = true;
    hpInput.hidden = false;
    hpInput.select();
    hpInput.focus();
  });

  hpInput.addEventListener("click", (e) => e.stopPropagation());

  const commit = async () => {
    hpInput.hidden = true;
    hpLabel.hidden = false;
    const raw = hpInput.value.trim();
    if (!raw) return;

    const current = getHp();
    const max     = getHpMax();
    let next;

    if (raw.startsWith("+") || raw.startsWith("-")) {
      const delta = Number(raw);
      if (Number.isNaN(delta)) return;
      next = current + delta;
    } else {
      next = Number(raw);
      if (Number.isNaN(next)) return;
    }

    next = Math.max(0, Math.min(max, Math.round(next)));
    await onHpCommit(next);
  };

  hpInput.addEventListener("blur", commit);
  hpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); hpInput.blur(); }
    if (e.key === "Escape") { hpInput.value = ""; hpInput.blur(); }
  });
}

// ---------------------------------------------------------------------------
// Tab injection
// ---------------------------------------------------------------------------

async function onRenderActorSheet(app, html) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.type !== "character") return;
  if (!getRigPilotItem(actor)) return;

  const root = html instanceof HTMLElement ? html : html[0];

  // --- Nav button: inject once (persists across re-renders) ---
  if (!root.querySelector('a[data-tab="rig"][data-group="primary"]')) {
    const tabNav = root.querySelector('nav[data-group="primary"]');
    if (!tabNav) {
      console.warn(`${MODULE_ID} | Could not find tab nav`);
      return;
    }
    tabNav.insertAdjacentHTML(
      "beforeend",
      `<a class="item control" data-tab="rig" data-group="primary"
          data-tooltip="${game.i18n.localize(`${MODULE_ID}.TabRig`)}">
        <i class="fas fa-robot"></i>
      </a>`
    );
  }

  // --- Panel: always remove and re-inject so content reflects current state ---
  root.querySelector('section[data-tab="rig"][data-group="primary"]')?.remove();

  const tabContent = await foundry.applications.handlebars.renderTemplate(
    `modules/${MODULE_ID}/templates/actor-rig-tab.hbs`,
    buildRigTabContext(actor, app)
  );

  const existingPanel = root.querySelector('[data-group="primary"][data-tab]');
  const tabContainer = existingPanel?.parentElement;
  if (!tabContainer) {
    console.warn(`${MODULE_ID} | Could not find tab content container`);
    return;
  }
  tabContainer.insertAdjacentHTML("beforeend", tabContent);

  const piloting = isPiloting(actor);
  const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const t   = (key) => game.i18n.localize(`${MODULE_ID}.${key}`);

  // --- Rig stats section ---
  const rigSection = root.querySelector(".rig-stats-section");
  if (rigSection) {
    wireStatsSection(rigSection, {
      getImg: () => actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_IMG_DEFAULT,
      onImgEdit: (app.isEditable && app._mode === 2)
        ? (path) => actor.setFlag(MODULE_ID, FLAGS.RIG_IMG, path)
        : null,
      imgTitle: t("RigPortrait"),
      uuid: actor.uuid,
      buildAcTooltip: () => {
        const intMod = actor.system.abilities.int.mod ?? 0;
        const pb     = actor.system.attributes.prof ?? 0;
        const base   = 10;
        const total  = base + intMod + pb;
        return `<table>
          <caption>${game.i18n.localize("DND5E.ArmorClass")}</caption>
          <tbody>
            <tr>
              <td class="attribution-value mode-ADD">+${base}</td>
              <td class="attribution-label">${t("TooltipACBase")}</td>
            </tr>
            <tr>
              <td class="attribution-value mode-ADD">${fmt(intMod)}</td>
              <td class="attribution-label">${t("TooltipACIntMod")}</td>
            </tr>
            <tr>
              <td class="attribution-value mode-ADD">${fmt(pb)}</td>
              <td class="attribution-label">${t("TooltipACProfBonus")}</td>
            </tr>
            <tr class="total">
              <td class="attribution-value">${total}</td>
              <td class="attribution-label">${t("TooltipTotal")}</td>
            </tr>
          </tbody>
        </table>`;
      },
      getHp:    () => piloting
        ? (actor.system.attributes.hp.value ?? 0)
        : (actor.getFlag(MODULE_ID, FLAGS.RIG_HP) ?? 0),
      getHpMax: () => 5 + 5 * getArtificerLevel(actor),
      onHpCommit: app.isEditable
        ? async (next) => {
            if (piloting) await actor.update({ "system.attributes.hp.value": next });
            else          await actor.setFlag(MODULE_ID, FLAGS.RIG_HP, next);
          }
        : null,
    });
  }

  // --- Pilot stats section (only present in DOM while piloting) ---
  const pilotSection = root.querySelector(".pilot-section");
  if (pilotSection) {
    const stash = actor.getFlag(MODULE_ID, FLAGS.VALUE_STASH);
    wireStatsSection(pilotSection, {
      getImg:    () => stash?.img ?? actor.img,
      onImgEdit: null, // pilot portrait is read-only while piloting
      imgTitle:  t("PilotPortrait"),
      uuid:      actor.uuid,
      buildAcTooltip: () => {
        const total = actor.getFlag(MODULE_ID, FLAGS.PILOT_DISPLAY_AC) ?? 0;
        return `<table>
          <caption>${game.i18n.localize("DND5E.ArmorClass")}</caption>
          <tbody>
            <tr class="total">
              <td class="attribution-value">${total}</td>
              <td class="attribution-label">${t("TooltipTotal")}</td>
            </tr>
          </tbody>
        </table>`;
      },
      getHp:      () => stash?.system?.attributes?.hp?.value ?? 0,
      getHpMax:   () => stash?.system?.attributes?.hp?.max ?? 0,
      onHpCommit: null, // pilot HP is read-only while piloting
    });
  }

  // --- Titanic toggle ---
  root
    .querySelector('[data-action="toggleTitanic"]')
    ?.addEventListener("change", async (e) => {
      await actor.setFlag(MODULE_ID, FLAGS.IS_TITANIC, e.target.checked);
    });

  // --- Edit mode toggle interception ---
  // The toggle is a <slide-toggle data-action="changeMode" class="mode-slider">
  // custom element. When piloting, intercept clicks going into edit mode and
  // show a warning dialog before allowing the mode change.
  const modeToggle = root.querySelector('slide-toggle[data-action="changeMode"]');
  if (modeToggle) {
    if (app._rigModeToggleHandler) {
      modeToggle.removeEventListener("click", app._rigModeToggleHandler, true);
    }
    if (piloting) {
      app._rigModeToggleHandler = async (e) => {
        // The slide-toggle's internal checked state flips on click; read it
        // before the click resolves. "checked" === EDIT mode in dnd5e's convention.
        const goingToEdit = !modeToggle.checked;
        if (!goingToEdit) return; // returning to play mode — allow freely

        e.stopImmediatePropagation();
        e.preventDefault();

        const result = await foundry.applications.api.DialogV2.wait({
          window: { title: t("EditWhilePilotingTitle") },
          content: t("EditWhilePilotingContent"),
          buttons: [
            { label: t("EditWhilePilotingCancel"),   action: "cancel" },
            { label: t("EditWhilePilotingContinue"), action: "continue" },
          ],
        });

        if (result === "continue") {
          modeToggle.removeEventListener("click", app._rigModeToggleHandler, true);
          modeToggle.click();
          modeToggle.addEventListener("click", app._rigModeToggleHandler, true);
        }
      };
      modeToggle.addEventListener("click", app._rigModeToggleHandler, true);
    } else {
      app._rigModeToggleHandler = null;
    }
  }

  // --- Tab system: restore state + wire click listeners ---
  setupRigTab(app, root);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerActorSheetHooks() {
  // Pre-load the stats section partial so it is available when renderTemplate runs.
  foundry.applications.handlebars.loadTemplates([
    `modules/${MODULE_ID}/templates/stats-section.hbs`,
  ]);
  Hooks.on("renderActorSheetV2", onRenderActorSheet);
}
