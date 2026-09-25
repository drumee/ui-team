// ===========================================================
//  Document-tabs rail — the list on the left of the editor
//  (Google Docs "Document tabs": header + "+", one row per
//  tab, a ⋮ menu per row).
//
//  Plain DOM, not Skeletons: the rail repaints on every tab
//  change, and rebuilding a Skeletons subtree that often
//  churns views and their handlers for no gain. The window
//  owns the model and every click lands on one of its
//  methods (see docs/index.js).
// ===========================================================

/** <svg> of the sprite symbol `id`, sized `px`. */
function icon(id, px) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", px);
  svg.setAttribute("height", px);
  svg.setAttribute("class", "editor-docs__tab-glyph");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${id}`);
  svg.appendChild(use);
  return svg;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/**
 * The row menu: Rename / Duplicate / Delete, anchored under the ⋮.
 *
 * @param {Object} ui   the editor window
 * @param {Object} tab
 * @param {Element} anchor
 * @param {Boolean} canDelete
 */
function openRowMenu(ui, tab, anchor, canDelete) {
  const old = ui.el.querySelector(".editor-docs__tab-menu");
  if (old) old.remove();
  const menu = el("div", "editor-docs__tab-menu");
  const add = (label, fn, disabled) => {
    const row = el("div", `editor-docs__tab-menu-item${disabled ? " is-disabled" : ""}`, label);
    if (!disabled) {
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.remove();
        fn();
      });
    }
    menu.appendChild(row);
  };
  add(LOCALE.RENAME || "Rename", () => startRename(ui, tab));
  add(LOCALE.DUPLICATE || "Duplicate", () => ui.duplicateTab(tab.id));
  add(LOCALE.DELETE || "Delete", () => ui.removeTab(tab.id), !canDelete);
  ui.el.appendChild(menu);
  const a = anchor.getBoundingClientRect();
  const host = ui.el.getBoundingClientRect();
  // Flip above the ⋮ when the row sits low enough that the menu would run off
  // the bottom of the window.
  const h = menu.getBoundingClientRect().height || 120;
  const below = a.bottom - host.top + 4;
  menu.style.top = `${below + h > host.height ? Math.max(4, a.top - host.top - h - 4) : below}px`;
  menu.style.left = `${Math.max(4, a.left - host.left - 60)}px`;
  const close = (e) => {
    if (menu.contains(e.target)) return;
    menu.remove();
    document.removeEventListener("pointerdown", close, true);
  };
  setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
}

/** Turn a row's label into an input; Enter or blur commits, Escape abandons. */
function startRename(ui, tab) {
  const row = ui.el.querySelector(`.editor-docs__tab-row[data-tab="${tab.id}"]`);
  if (!row) return;
  const label = row.querySelector(".editor-docs__tab-name");
  if (!label) return;
  const input = el("input", "editor-docs__tab-input");
  input.value = tab.name || "";
  label.replaceWith(input);
  input.focus();
  input.select();
  let done = 0;
  const commit = (save) => {
    if (done) return;
    done = 1;
    if (save) ui.renameTab(tab.id, input.value);
    else ui.renderTabs();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit(1);
    else if (e.key === "Escape") commit(0);
    e.stopPropagation();
  });
  input.addEventListener("blur", () => commit(1));
}

/**
 * Build the rail.
 *
 * @param {Object} ui      the editor window (owns the model + the actions)
 * @param {Array}  tabs
 * @param {String} active
 * @returns {Element}
 */
function build(ui, tabs, active, opt = {}) {
  const root = el("div", "editor-docs__tabs");

  const top = el("div", "editor-docs__tabs-top");
  const back = el("div", "editor-docs__tabs-close");
  back.appendChild(icon("--icon-arrow-left", 18));
  back.title = LOCALE.CLOSE || "Close";
  back.addEventListener("click", () => ui.toggleTabs(false));
  top.appendChild(back);
  root.appendChild(top);

  const head = el("div", "editor-docs__tabs-head");
  head.appendChild(el("span", "editor-docs__tabs-title", LOCALE.DOCUMENT_TABS || "Document tabs"));
  const plus = el("div", "editor-docs__tabs-add");
  plus.appendChild(icon("--icon-app-add", 18));
  plus.title = LOCALE.NEW_TAB || "New tab";
  plus.addEventListener("click", () => ui.addTab());
  head.appendChild(plus);
  root.appendChild(head);

  const list = el("div", "editor-docs__tabs-list");
  for (const t of tabs) {
    const state = [];
    if (t.id === active) state.push("is-active");
    if (t.id === opt.loading) state.push("is-loading");
    const row = el("div", `editor-docs__tab-row${state.length ? " " + state.join(" ") : ""}`);
    row.dataset.tab = t.id;
    row.appendChild(icon("--icon-raw-documents_udoc", 18));
    row.appendChild(el("span", "editor-docs__tab-name", t.name || ""));
    const more = el("div", "editor-docs__tab-more", "⋮");
    more.addEventListener("click", (e) => {
      e.stopPropagation();
      openRowMenu(ui, t, more, tabs.length > 1);
    });
    row.appendChild(more);
    row.addEventListener("click", () => ui.selectTab(t.id));
    row.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      startRename(ui, t);
    });

    // Reordering. HTML5 drag and drop rather than pointer maths: the rows are
    // a plain list, the browser draws the drag image, and a drop that lands
    // outside simply does nothing.
    row.draggable = true;
    row.addEventListener("dragstart", (e) => {
      row.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", t.id);
      } catch (err) {
        /** some browsers refuse custom types */
      }
      list.dataset.dragging = t.id;
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("is-dragging");
      delete list.dataset.dragging;
      [...list.children].forEach((c) => c.classList.remove("is-drop-before"));
    });
    row.addEventListener("dragover", (e) => {
      if (!list.dataset.dragging || list.dataset.dragging === t.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const b = row.getBoundingClientRect();
      const before = e.clientY < b.top + b.height / 2;
      [...list.children].forEach((c) => c.classList.remove("is-drop-before"));
      row.classList.add("is-drop-before");
      row.dataset.dropBefore = before ? "1" : "0";
    });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const moved = list.dataset.dragging;
      if (!moved || moved === t.id) return;
      const before = row.dataset.dropBefore !== "0";
      const idx = tabs.findIndex((x) => x.id === t.id);
      const anchorTab = before ? t : tabs[idx + 1];
      ui.reorderTabs(moved, anchorTab ? anchorTab.id : null);
    });
    list.appendChild(row);
  }
  root.appendChild(list);
  return root;
}

module.exports = { build };
