/**
 * ApplicationV2's native TabsV2 ignores dynamically-injected tabs.
 * This file provides tab management functionality for dynamically-injected tabs.
 *
 * Called after every render to re-wire listeners and restore active state.
 * Stores handler references on `app` so old listeners can be removed before
 * new ones are added, preventing accumulation across re-renders.
 */

// Whether a dynamically-injected tab is the active tab.
// Used to restore the dynamically-injected tab after a re-render.
export const DI_TAB_ACTIVE_FIELD = '_dynamicallyInjectedTabActive'

// Changes the active tab by:
// - updating ApplicationV2's tabGroups so native tabs see a state change on next click
// - unmarking the current tab and nav button as active
// - marking the selected tab and nav button as active
export function activateTab(app, root, tabId) {
  // Update ApplicationV2's tab group state so that clicking any native tab
  // afterward is never treated as "already active" (which would be a no-op).
  // ApplicationV2 uses app.tabGroups (a plain object) — not app._tabs._active
  // (which is the ApplicationV1 property and is always undefined here).
  if (app.tabGroups) app.tabGroups["primary"] = tabId;

  root.querySelectorAll('nav[data-group="primary"] .item')
    .forEach((el) => el.classList.remove("active"));
  root.querySelectorAll('[data-group="primary"][data-tab]')
    .forEach((el) => el.classList.remove("active"));

  root.querySelector(`a[data-tab="${tabId}"][data-group="primary"]`)
    ?.classList.add("active");
  root.querySelector(`section[data-tab="${tabId}"][data-group="primary"]`)
    ?.classList.add("active");

  app[DI_TAB_ACTIVE_FIELD] = tabId;
}

export function deactivateTab(app, root, tabId) {
  root.querySelector(`a[data-tab="${tabId}"][data-group="primary"]`)
    ?.classList.remove("active");
  root.querySelector(`section[data-tab="${tabId}"][data-group="primary"]`)
    ?.classList.remove("active");

  app[DI_TAB_ACTIVE_FIELD] = false;
}
