/** ================================================================== *
#   FILE : /src/drumee/builtins/editor/menu-policy
#   TYPE : helper shared by editor_docs / editor_sheet
# ===================================================================**/

/**
 * Casual's menu bars, cut down to what works inside Drumee. Some built-in
 * rows do nothing here, others work against Drumee (a local file replacing
 * the document, a theme switch for the whole desk, versions kept in one
 * browser), and a few are better answered by Drumee itself (Make a copy is a
 * copy in the folder, not a download). Neither SDK lets a host drop or
 * replace a built-in row (Casual Docs has no per-row gate at all, Casual
 * Sheets gates only some), so:
 *   - an open dropdown is trimmed as soon as React renders it (a subtree
 *     observer on the window, before paint), and the separators left at an
 *     edge or doubled up are hidden with the rows;
 *   - a rerouted row is caught in the CAPTURE phase on the window element,
 *     which runs before React's listeners on the (descendant) mount host, so
 *     Casual's own handler never sees the press;
 *   - a row of Drumee's own can be added to a dropdown (`extra`), handled
 *     like a rerouted one. The dropdown stays Casual's: it opens on click,
 *     on hover while another menu is open, and from the keyboard alike.
 *
 * @param {Element} root    the editor window element
 * @param {object}  policy
 *   key(row)       the row's stable name (docs: its label, sheets: its testid)
 *   hidden(key)    true to hide the row
 *   actions        { [key]: (row) => void } rows answered by Drumee, or
 *   action(key)    the same as a function (null: Casual's own handler runs)
 *   enabled(key)   true to enable a row Casual left disabled
 *   extra(menu)    adds Drumee rows to a dropdown when it opens
 *   close(trigger) closes the dropdown the trigger opened
 * @returns {Function} detach
 */
const ROW = '[role="menuitem"]';
const MENU = '[role="menu"]';

function attachMenuPolicy(root, policy = {}) {
  if (!root) return () => {};
  const actions = policy.actions || {};
  const actionOf = (key, row) =>
    (policy.action ? policy.action(key, row) : actions[key]) || null;

  const keyOf = (row) => {
    try {
      return (policy.key && policy.key(row)) || "";
    } catch (e) {
      return "";
    }
  };

  // What to hide for a row: Casual Docs wraps every row (and its submenu) in
  // a positioned div of its own, Casual Sheets only its submenu rows.
  const boxOf = (row, menu) => {
    const p = row.parentElement;
    return p && p !== menu && p.firstElementChild === row ? p : row;
  };

  const tidy = (menu) => {
    let last = null; // "row" | "sep" — the last child left visible
    let lastSep = null;
    for (const c of menu.children) {
      if (c.getAttribute("role") === "separator") {
        const show = last === "row";
        c.style.display = show ? "" : "none";
        if (show) {
          last = "sep";
          lastSep = c;
        }
        continue;
      }
      if (c.style.display === "none") continue;
      last = "row";
    }
    if (last === "sep" && lastSep) lastSep.style.display = "none";
  };

  const enable = (row) => {
    row.disabled = false;
    row.removeAttribute("aria-disabled");
    row.style.color = "var(--doc-text, #374151)";
    row.style.cursor = "pointer";
  };

  const apply = (menu) => {
    for (const row of menu.querySelectorAll(`:scope > ${ROW}, :scope > div > ${ROW}`)) {
      const key = keyOf(row);
      if (!key) continue;
      const box = boxOf(row, menu);
      if (policy.hidden && policy.hidden(key, row)) {
        box.style.display = "none";
        box.dataset.menuPolicy = "hidden";
      } else if (box.dataset.menuPolicy === "hidden") {
        box.style.display = "";
        delete box.dataset.menuPolicy;
      }
      if (row.disabled && policy.enabled && policy.enabled(key, row)) enable(row);
    }
    if (policy.extra) {
      try {
        policy.extra(menu);
      } catch (e) {
        /** dropdown gone */
      }
    }
    tidy(menu);
  };

  const scan = (node) => {
    if (!node || node.nodeType !== 1) return;
    const menus = node.matches(MENU) ? [node] : [];
    for (const m of node.querySelectorAll(MENU)) menus.push(m);
    const up = node.parentElement && node.parentElement.closest(MENU);
    if (up) menus.push(up);
    for (const m of menus) apply(m);
  };

  // Mutations inside the document pages are by far the most frequent; only
  // the ones that add a dropdown (or rows to one) matter.
  const obs = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches(MENU) || n.querySelector(MENU) || (n.closest && n.closest(MENU))) scan(n);
      }
    }
  });
  obs.observe(root, { childList: true, subtree: true });

  // The top-level dropdown a row belongs to, and the menubar button of it.
  const triggerOf = (row) => {
    let menu = row.closest(MENU);
    while (menu && menu.parentElement && menu.parentElement.closest(MENU)) {
      menu = menu.parentElement.closest(MENU);
    }
    return menu && menu.parentElement
      ? menu.parentElement.querySelector(':scope > button[aria-haspopup="menu"]')
      : null;
  };

  const onPress = (e) => {
    const row = e.target && e.target.closest && e.target.closest(ROW);
    if (!row || !root.contains(row)) return;
    const act = actionOf(keyOf(row), row);
    if (!act) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type !== "click") return;
    const trigger = triggerOf(row);
    try {
      if (trigger && policy.close) policy.close(trigger);
    } catch (err) {
      /** menu already gone */
    }
    act(row);
  };
  const EVENTS = ["pointerdown", "mousedown", "click"];
  for (const ev of EVENTS) root.addEventListener(ev, onPress, true);

  return () => {
    obs.disconnect();
    for (const ev of EVENTS) root.removeEventListener(ev, onPress, true);
  };
}

module.exports = { attachMenuPolicy };
