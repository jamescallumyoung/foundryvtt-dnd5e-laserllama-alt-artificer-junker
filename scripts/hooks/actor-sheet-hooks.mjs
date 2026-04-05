import { MODULE_ID, FLAGS, RIG_IMG_DEFAULT } from "../constants.mjs";
import { getRigPilotItem, isPiloting } from "../helpers.mjs";
import { getRigStats } from "../rig-stats.mjs";
import { setupRigTab } from "../setup-rig-tab.mjs";

// ---------------------------------------------------------------------------
// Handlebars helpers
// ---------------------------------------------------------------------------

Handlebars.registerHelper("abilityMod", (score) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the actor's Artificer class level, or 0 if not found.
 * Falls back to 0 if the class identifier is not "artificer".
 *
 * @param {Actor} actor
 * @returns {number}
 */
function getArtificerLevel(actor) {
  return (
    Object.values(actor.classes ?? {}).find(
      (c) => c.system.identifier === "artificer"
    )?.system.levels ?? 0
  );
}

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

  return {
    isTitanic,
    rigStats,
    // Match dnd5e's own context.editable: requires both ownership AND edit mode.
    // app.isEditable alone is permission-only (always true for the owner).
    isEditable: app.isEditable && app._mode === 2,
    isPiloting: piloting,
    rigHp,
    computedAC:
      10 +
      (actor.system.abilities.int.mod ?? 0) +
      (actor.system.attributes.prof ?? 0),
    computedHpMax,
    hpPct: computedHpMax > 0 ? Math.round((rigHp / computedHpMax) * 100) : 0,
    rigImg: actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_IMG_DEFAULT,
  };
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

  // --- Rig portrait ---
  const portrait = root.querySelector(".rig-portrait");
  if (portrait) {
    portrait.addEventListener("click", () => {
      const current = actor.getFlag(MODULE_ID, FLAGS.RIG_IMG) ?? RIG_IMG_DEFAULT;
      const inEditMode = app.isEditable && app._mode === 2;
      if (inEditMode) {
        new FilePicker({
          type: "image",
          current,
          callback: (path) => actor.setFlag(MODULE_ID, FLAGS.RIG_IMG, path),
        }).render(true);
      } else {
        new ImagePopout(current, {
          title: game.i18n.localize(`${MODULE_ID}.RigPortrait`),
          uuid: actor.uuid,
        }).render(true);
      }
    });
  }

  // --- Rig HP editing ---
  // HP is always editable by the owner regardless of sheet mode (play vs edit),
  // matching how dnd5e treats HP as a dynamic combat value.
  // TODO (stage 5): when isPiloting, write to actor.system.attributes.hp instead.
  const hpMeter = root.querySelector(".rig-tab .meter.hit-points");
  const hpLabel = hpMeter?.querySelector(".progress .label");
  const hpInput = hpMeter?.querySelector(".rig-hp-input");

  if (hpMeter && hpLabel && hpInput && app.isEditable) {
    hpMeter.addEventListener("click", () => {
      const current = actor.getFlag(MODULE_ID, FLAGS.RIG_HP) ?? 0;
      hpInput.value = String(current);
      hpLabel.hidden = true;
      hpInput.hidden = false;
      hpInput.select();
      hpInput.focus();
    });

    // Prevent clicks inside the input from re-triggering the meter click.
    hpInput.addEventListener("click", (e) => e.stopPropagation());

    const commitHp = async () => {
      hpInput.hidden = true;
      hpLabel.hidden = false;
      const raw = hpInput.value.trim();
      if (!raw) return;

      const max = 5 + 5 * getArtificerLevel(actor);
      const current = actor.getFlag(MODULE_ID, FLAGS.RIG_HP) ?? 0;
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
      await actor.setFlag(MODULE_ID, FLAGS.RIG_HP, next);
    };

    hpInput.addEventListener("blur", commitHp);
    hpInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); hpInput.blur(); }
      if (e.key === "Escape") { hpInput.value = ""; hpInput.blur(); }
    });
  }

  // --- Titanic toggle ---
  root
    .querySelector('[data-action="toggleTitanic"]')
    ?.addEventListener("change", async (e) => {
      await actor.setFlag(MODULE_ID, FLAGS.IS_TITANIC, e.target.checked);
    });

  // --- AC badge attribution tooltip ---
  // Uses the same pattern as dnd5e's Tooltips5e: activate Foundry's tooltip
  // then override innerHTML with an attribution table, since data-attribution
  // reads the actor's real AC formula rather than our custom rig formula.
  const acBadge = root.querySelector('.rig-tab .ac-badge');
  if (acBadge) {
    const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
    acBadge.addEventListener("mouseenter", () => {
      const intMod = actor.system.abilities.int.mod ?? 0;
      const pb     = actor.system.attributes.prof ?? 0;
      const base   = 10;
      const total  = base + intMod + pb;

      const t = (key) => game.i18n.localize(`${MODULE_ID}.${key}`);

      const html = `<table>
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

      // game.tooltip.element is the hovered element, not the tooltip DOM node.
      // Use #tooltip directly, same as dnd5e's Tooltips5e does internally.
      game.tooltip.activate(acBadge, {
        direction: "DOWN",
        cssClass: "property-attribution",
        text: game.i18n.localize("DND5E.ArmorClass"), // prevents rendering "undefined"
      });
      document.getElementById("tooltip")?.replaceChildren(
        document.createRange().createContextualFragment(html)
      );
    });
    acBadge.addEventListener("mouseleave", () => game.tooltip.deactivate());
  }

  // --- Tab system: restore state + wire click listeners ---
  setupRigTab(app, root);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerActorSheetHooks() {
  Hooks.on("renderActorSheetV2", onRenderActorSheet);
}
