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
 *   submenus       { [key]: (row) => [{ label, icon?, run }] } rows that
 *                  open a side panel of rows on hover (Export ▸): neither
 *                  SDK takes a submenu from a host. The panel is a
 *                  role="menu" inside the dropdown, so the skins style it as
 *                  Casual's own submenus and a press in it is "inside".
 *   rowHover       background of a hovered panel row (docs paints its rows'
 *                  hover inline; sheets' skin does it in CSS)
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

  // ── Submenus ─────────────────────────────────────────────────────────
  const submenus = policy.submenus || {};
  const CHEVRON =
    "M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"; // Material chevron_right
  let open = null; // { row, panel }
  let closeTimer = null;

  const closePanel = () => {
    clearTimeout(closeTimer);
    if (open) {
      open.panel.remove();
      open.row.setAttribute("aria-expanded", "false");
      open = null;
    }
  };

  // The arrow at the end of a row that opens a submenu — ours (Export ▸) and
  // Casual's own (Casual Docs draws none; Casual Sheets draws its
  // chevron_right, kept as is).
  // Checked by element, not by a flag: a React re-render of the row drops
  // the arrow but keeps the row.
  const ensureArrow = (row) => {
    if (row.querySelector(":scope > [data-menu-policy-arrow]")) return;
    const last = row.lastElementChild;
    if (last && last !== row.firstElementChild && /chevron|›|▸/.test(last.textContent || "")) return;
    // Casual Docs' own arrow: a text-less <span style="margin-left:auto">
    // holding a 16px svg, already at the end of the row — kept as is (a
    // second arrow split the free space with it, so it sat by the label).
    if (
      last &&
      last !== row.firstElementChild &&
      last.tagName === "SPAN" &&
      !(last.textContent || "").trim() &&
      last.children.length === 1 &&
      last.firstElementChild.tagName.toLowerCase() === "svg"
    ) {
      return;
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 -960 960 960");
    // Casual Docs' arrow size.
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "margin-left:auto;flex:none";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", CHEVRON);
    svg.appendChild(path);
    svg.dataset.menuPolicyArrow = "1";
    row.appendChild(svg);
  };

  const markParent = (row) => {
    ensureArrow(row);
    if (row.dataset.menuPolicyParent) return;
    row.dataset.menuPolicyParent = "1";
    row.setAttribute("aria-haspopup", "menu");
    row.setAttribute("aria-expanded", "false");
  };

  const openPanel = (row) => {
    if (open && open.row === row) return;
    closePanel();
    const items = (submenus[keyOf(row)] || (() => []))(row) || [];
    if (!items.length) return;
    const menu = row.closest(MENU);
    if (!menu) return;
    const panel = document.createElement("div");
    panel.setAttribute("role", "menu");
    panel.dataset.menuPolicySub = "1";
    // The host dropdown's own card (Casual docs paints it inline).
    const cs = getComputedStyle(menu);
    panel.style.cssText = [
      "position:absolute",
      "z-index:1",
      `min-width:${Math.max(160, Math.round(menu.getBoundingClientRect().width * 0.8))}px`,
      `background:${cs.backgroundColor}`,
      `border:${cs.border}`,
      `border-radius:${cs.borderRadius}`,
      `box-shadow:${cs.boxShadow}`,
      `padding:${cs.padding}`,
      "display:flex",
      "flex-direction:column",
    ].join(";");
    for (const it of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "menuitem");
      b.dataset.menuPolicySubRow = "1";
      b.style.cssText = row.style.cssText;
      b.style.backgroundColor = "transparent";
      if (it.icon) b.appendChild(it.icon);
      const label = document.createElement("span");
      label.textContent = it.label;
      b.appendChild(label);
      b._menuPolicyRun = it.run;
      if (policy.rowHover) {
        b.addEventListener("mouseover", () => {
          b.style.backgroundColor = policy.rowHover;
        });
        b.addEventListener("mouseout", () => {
          b.style.backgroundColor = "transparent";
        });
      }
      panel.appendChild(b);
    }
    // Beside the row, its top on the row's top; on the left when the right
    // has no room.
    const mr = menu.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    panel.style.top = `${rr.top - mr.top + menu.scrollTop - parseFloat(cs.paddingTop || 0)}px`;
    menu.appendChild(panel);
    const pw = panel.getBoundingClientRect().width;
    const right = mr.right + pw <= window.innerWidth - 8;
    panel.style.left = right ? `${mr.width - 4}px` : `${-pw + 4}px`;
    panel.addEventListener("mouseenter", () => clearTimeout(closeTimer));
    panel.addEventListener("mouseleave", () => {
      closeTimer = setTimeout(closePanel, 200);
    });
    row.setAttribute("aria-expanded", "true");
    open = { row, panel };
  };

  // Hover opens / switches, leaving both the row and its panel closes.
  const onOver = (e) => {
    const row = e.target && e.target.closest && e.target.closest(ROW);
    if (!row || !root.contains(row) || row.dataset.menuPolicySubRow) return;
    if (submenus[keyOf(row)]) {
      clearTimeout(closeTimer);
      markParent(row);
      openPanel(row);
    } else if (open && row !== open.row) {
      closePanel();
    }
  };
  const onOut = (e) => {
    if (!open) return;
    const row = e.target && e.target.closest && e.target.closest(ROW);
    if (row !== open.row) return;
    const to = e.relatedTarget;
    if (to && (open.row.contains(to) || open.panel.contains(to))) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePanel, 200);
  };
  root.addEventListener("mouseover", onOver, true);
  root.addEventListener("mouseout", onOut, true);

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
    for (const row of menu.querySelectorAll(ROW)) {
      if (row.dataset.menuPolicySubRow) continue;
      if (submenus[keyOf(row)]) markParent(row);
      else if (row.getAttribute("aria-haspopup") === "menu") ensureArrow(row);
    }
    if (menu.dataset.menuPolicySub) return;
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
    // A submenu parent opens its panel instead of closing the dropdown.
    if (!row.dataset.menuPolicySubRow && submenus[keyOf(row)]) {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click") {
        markParent(row);
        openPanel(row);
      }
      return;
    }
    // A panel row: run it, then close the dropdown like a rerouted row.
    if (row.dataset.menuPolicySubRow) {
      e.preventDefault();
      e.stopPropagation();
      if (e.type !== "click") return;
      const run = row._menuPolicyRun;
      const trigger = triggerOf(row);
      closePanel();
      try {
        if (trigger && policy.close) policy.close(trigger);
      } catch (err) {
        /** menu already gone */
      }
      if (run) run(row);
      return;
    }
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
    closePanel();
    for (const ev of EVENTS) root.removeEventListener(ev, onPress, true);
    root.removeEventListener("mouseover", onOver, true);
    root.removeEventListener("mouseout", onOut, true);
  };
}

module.exports = { attachMenuPolicy };
