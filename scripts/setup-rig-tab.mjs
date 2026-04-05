import { activateTab, deactivateTab, DI_TAB_ACTIVE_FIELD } from "./tab-system.mjs";

export function setupRigTab(app, root) {
  const tabId = 'rig'
  
  const rigTabBtn = root.querySelector(`a[data-tab="${tabId}"][data-group="primary"]`);
  const tabNav = root.querySelector('nav[data-group="primary"]');
  if (!rigTabBtn || !tabNav) return;

  const activateRigTab = () => activateTab(app, root, tabId);
  const deactivateRigTab = () => deactivateTab(app, root, tabId);

  // Restore active state after a re-render wiped and re-injected the panel.
  if (app[DI_TAB_ACTIVE_FIELD] === tabId) {
    activateRigTab();
  }

  // --- Rig button click ---
  // Remove previous handler (button may have persisted across re-render).
  if (app._rigBtnClickHandler) {
    rigTabBtn.removeEventListener("click", app._rigBtnClickHandler);
  }
  app._rigBtnClickHandler = () => activateRigTab();
  rigTabBtn.addEventListener("click", app._rigBtnClickHandler);

  // --- Native tab click: hand control back to the native system ---
  // Nav persists across re-renders; remove previous handler before adding.
  if (app._rigNavClickHandler) {
    tabNav.removeEventListener("click", app._rigNavClickHandler);
  }
  app._rigNavClickHandler = (e) => {
    const target = e.target.closest(".item[data-tab]");
    if (target && target !== rigTabBtn) {
      deactivateRigTab();
    }
  };
  tabNav.addEventListener("click", app._rigNavClickHandler);
}
