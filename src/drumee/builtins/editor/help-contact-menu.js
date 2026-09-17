/** ================================================================== *
#   FILE : /src/drumee/builtins/editor/help-contact-menu
#   TYPE : helper shared by editor_docs / editor_sheet
# ===================================================================**/

/**
 * Casual's "Help" menubar item keeps its place, but opens a one-row Drumee
 * menu ("Contact us") that leads to the support conversation instead of
 * Casual's own Help menu (Report issue / About Casual…). Neither Casual SDK
 * lets us replace those items, so the button's events are intercepted in the
 * CAPTURE phase on the window element — which runs before React's listeners
 * on the (descendant) mount host, so Casual's dropdown never opens — and a
 * small popover of ours is shown under the button.
 *
 * @param {object}   editor  window view (has .el and contactSupport())
 * @param {Function} isHelp  (eventTarget) → true when it is the Help button
 */
const STYLE_ID = "editor-help-menu-style";
const CSS = `
.editor-help-menu{position:absolute;z-index:20000;min-width:180px;padding:6px;background:#fff;border:1px solid #e3e6ea;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);font:14px/1.3 Inter,system-ui,sans-serif;color:#1f2328}
.editor-help-menu__item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;cursor:pointer;white-space:nowrap;user-select:none}
.editor-help-menu__item:hover{background:#f1f3f6}
.editor-sheet[data-theme="dark"] .editor-help-menu{background:#2a2e35;border-color:#3a3f47;color:#e7ebf3}
.editor-sheet[data-theme="dark"] .editor-help-menu__item:hover{background:#3a3f47}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function attachHelpContactMenu(editor, isHelp) {
  const el = editor && editor.el;
  if (!el || el.__helpMenuWired) return () => {};
  el.__helpMenuWired = 1;
  ensureStyle();

  let menu = null;
  const onOutside = (e) => {
    if (menu && !menu.contains(e.target) && !isHelp(e.target)) close();
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  function close() {
    if (menu) {
      menu.remove();
      menu = null;
    }
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
  }
  function open(btn) {
    close();
    menu = document.createElement("div");
    menu.className = "editor-help-menu";
    menu.setAttribute("role", "menu");
    const item = document.createElement("div");
    item.className = "editor-help-menu__item";
    item.setAttribute("role", "menuitem");
    item.textContent = LOCALE.CONTACT_US;
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
      if (typeof editor.contactSupport === "function") editor.contactSupport();
    });
    menu.appendChild(item);
    // Positioned inside the window element, right under the Help button.
    const host = el.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    menu.style.left = `${Math.round(r.left - host.left)}px`;
    menu.style.top = `${Math.round(r.bottom - host.top + 4)}px`;
    el.appendChild(menu);
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
  }

  for (const ev of ["pointerdown", "mousedown", "click"]) {
    el.addEventListener(
      ev,
      (e) => {
        if (!isHelp(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        if (ev !== "click") return;
        const btn = (e.target.closest && e.target.closest("button")) || e.target;
        if (menu) close();
        else open(btn);
      },
      true
    );
  }
  return close;
}

module.exports = { attachHelpContactMenu };
