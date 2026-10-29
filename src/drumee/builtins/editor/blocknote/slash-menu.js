import { createElement as h, useEffect, useRef } from "react";
import {
  filterSuggestionItems,
  getDefaultSlashMenuItems,
  insertOrUpdateBlockForSlashMenu,
  SuggestionMenu,
} from "@blocknote/core";
import { useBlockNoteEditor, useExtensionState } from "@blocknote/react";

/**
 * The Note's "/" menu, drawn to Lexis's Figma (node 1406:95201, 2026-10-22).
 *
 * BlockNote keeps doing the hard part — opening on "/", filtering, keyboard
 * navigation, running the chosen item — and only the LIST is ours: grouped
 * rows, a markdown shortcut on the right, and a "Close menu · esc" footer.
 *
 * Every row that BlockNote already offers runs BlockNote's own `onItemClick`,
 * looked up by key, so a block is never built by hand here and cannot drift
 * from the library's shape on an upgrade. Only two rows are ours: Callout
 * (a custom block, ./callout) and Toggle heading 4 (BlockNote stops its toggle
 * items at level 3, but its heading takes `isToggleable` at any level).
 *
 * 🚨 The Figma lists far more — Database views, charts, forms, synced blocks,
 * equations, columns, table of contents, mentions, dates. BlockNote has none
 * of them and each is a feature of its own, so they are NOT here (agreed with
 * Duy 2026-10-22). A row that does nothing would be worse than no row.
 */

/**
 * The rows, in Figma order. `key` names a BlockNote default slash item unless
 * `insert` is given; `ico` is a sprite icon, `glyph` a short text mark drawn
 * in the icon slot instead (the Figma draws headings as "H1".."H4").
 */
function rows() {
  return [
    {
      group: LOCALE.NOTE_SLASH_BASIC,
      items: [
        { key: "paragraph", title: LOCALE.NOTE_BLOCK_TEXT, ico: "ph-text-t" },
        { key: "heading", title: LOCALE.NOTE_BLOCK_H1, glyph: "H1", badge: "#" },
        { key: "heading_2", title: LOCALE.NOTE_BLOCK_H2, glyph: "H2", badge: "##" },
        { key: "heading_3", title: LOCALE.NOTE_BLOCK_H3, glyph: "H3", badge: "###" },
        { key: "heading_4", title: LOCALE.NOTE_BLOCK_H4, glyph: "H4", badge: "####" },
        { key: "bullet_list", title: LOCALE.NOTE_BLOCK_BULLET, ico: "ph-list-bullets", badge: "-" },
        { key: "numbered_list", title: LOCALE.NOTE_BLOCK_NUMBERED, ico: "ph-list-numbers", badge: "1." },
        { key: "check_list", title: LOCALE.NOTE_BLOCK_CHECK, ico: "ph-list-checks", badge: "[]" },
        { key: "toggle_list", title: LOCALE.NOTE_BLOCK_TOGGLE, ico: "ph-list-bullets", badge: ">" },
        {
          key: "callout",
          title: LOCALE.NOTE_BLOCK_CALLOUT,
          ico: "ph-text-t",
          boxed: 1,
          aliases: ["callout", "note", "info"],
          insert: { type: "callout" },
        },
        { key: "quote", title: LOCALE.NOTE_BLOCK_QUOTE, ico: "ph-quotes", badge: "\"" },
        { key: "divider", title: LOCALE.NOTE_BLOCK_DIVIDER, ico: "ph-line-vertical", badge: "---" },
      ],
    },
    {
      group: LOCALE.NOTE_SLASH_MEDIA,
      items: [
        { key: "image", title: LOCALE.NOTE_BLOCK_IMAGE, ico: "ph-image" },
        { key: "video", title: LOCALE.NOTE_BLOCK_VIDEO, ico: "ph-video" },
        { key: "audio", title: LOCALE.NOTE_BLOCK_AUDIO, ico: "ph-speaker-high" },
        { key: "code_block", title: LOCALE.NOTE_BLOCK_CODE, ico: "ph-code" },
        { key: "file", title: LOCALE.NOTE_BLOCK_FILE, ico: "ph-paperclip" },
      ],
    },
    {
      group: LOCALE.NOTE_SLASH_ADVANCED,
      items: [
        // Not in the Figma, kept on purpose: the old insert rail offered
        // tables, and notes written since then contain them.
        { key: "table", title: LOCALE.NOTE_BLOCK_TABLE, ico: "ph-table" },
        { key: "toggle_heading", title: LOCALE.NOTE_BLOCK_TOGGLE_H1, glyph: "H1", toggle: 1, badge: "# >" },
        { key: "toggle_heading_2", title: LOCALE.NOTE_BLOCK_TOGGLE_H2, glyph: "H2", toggle: 1, badge: "## >" },
        { key: "toggle_heading_3", title: LOCALE.NOTE_BLOCK_TOGGLE_H3, glyph: "H3", toggle: 1, badge: "### >" },
        {
          key: "toggle_heading_4",
          title: LOCALE.NOTE_BLOCK_TOGGLE_H4,
          glyph: "H4",
          toggle: 1,
          badge: "#### >",
          aliases: ["toggle heading", "h4"],
          insert: { type: "heading", props: { level: 4, isToggleable: true } },
        },
      ],
    },
    {
      group: LOCALE.NOTE_SLASH_INLINE,
      items: [{ key: "emoji", title: LOCALE.NOTE_BLOCK_EMOJI, ico: "ph-smiley" }],
    },
  ];
}

/**
 * The flat item list BlockNote filters and navigates. Rows whose block the
 * editor's schema does not offer are dropped rather than shown dead.
 *
 * @param {Object} editor
 * @returns {Array}
 */
export function noteSlashItems(editor) {
  const defaults = {};
  for (const item of getDefaultSlashMenuItems(editor) || []) {
    if (item && item.key) defaults[item.key] = item;
  }
  const out = [];
  for (const { group, items } of rows()) {
    for (const row of items) {
      const base = defaults[row.key];
      let onItemClick;
      if (row.insert) {
        if (!editor.schema.blockSchema[row.insert.type]) continue;
        onItemClick = () => insertOrUpdateBlockForSlashMenu(editor, row.insert);
      } else if (base) {
        onItemClick = base.onItemClick;
      } else {
        continue;
      }
      out.push({
        ...row,
        group,
        // BlockNote's own aliases are localised already; ours add the English
        // name so a search works in either.
        aliases: [...((base && base.aliases) || []), ...(row.aliases || []), row.key.replace(/_/g, " ")],
        onItemClick,
      });
    }
  }
  return out;
}

/**
 * @param {Object} editor
 * @returns {(query: String) => Promise<Array>}
 */
export function getNoteSlashItems(editor) {
  return async (query) => filterSuggestionItems(noteSlashItems(editor), query);
}

/** A sprite icon, the same `<use>` the Skeletons buttons render. */
function icon(name, className) {
  return h(
    "svg",
    { className, "aria-hidden": "true" },
    h("use", { href: `#--icon-${name}` })
  );
}

/**
 * The menu itself — handed to BlockNote's SuggestionMenuController, which
 * supplies the filtered items, the selected index and the click handler.
 */
export function NoteSlashMenu(props) {
  const { items, selectedIndex, onItemClick } = props;
  const editor = useBlockNoteEditor();
  const query = useExtensionState(SuggestionMenu, {
    selector: (s) => (s ? s.query : ""),
  });
  const listRef = useRef(null);

  // "/ Type to search": the hint sits in the text, next to the "/", only while
  // nothing has been typed after it. BlockNote decorates the "/" itself; the
  // container flag is what the skin keys the hint on.
  useEffect(() => {
    const root = editor && editor.domElement && editor.domElement.closest(".bn-container");
    if (!root) return undefined;
    root.dataset.slashEmpty = query ? "0" : "1";
    root.style.setProperty("--note-type-to-search", JSON.stringify(LOCALE.NOTE_TYPE_TO_SEARCH));
    return () => {
      delete root.dataset.slashEmpty;
    };
  }, [editor, query]);

  // Keyboard navigation moves the selection; keep it in view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector('[data-selected="1"]');
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const kids = [];
  let group;
  (items || []).forEach((item, i) => {
    if (item.group !== group) {
      if (group !== undefined) {
        kids.push(h("div", { key: `sep-${i}`, className: "note-slash__separator" }));
      }
      group = item.group;
      kids.push(h("div", { key: `group-${i}`, className: "note-slash__group" }, group));
    }
    const mark = item.glyph
      ? h(
          "span",
          { className: `note-slash__glyph${item.toggle ? " toggle" : ""}` },
          item.toggle ? h("span", { className: "note-slash__toggle-mark" }) : null,
          item.glyph
        )
      : h(
          "span",
          { className: `note-slash__icon${item.boxed ? " boxed" : ""}` },
          icon(item.ico, "note-slash__svg")
        );
    kids.push(
      h(
        "div",
        {
          key: item.key,
          id: `bn-suggestion-menu-item-${i}`,
          className: "note-slash__item",
          "data-selected": i === selectedIndex ? "1" : "0",
          role: "option",
          "aria-selected": i === selectedIndex,
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => onItemClick && onItemClick(item),
        },
        mark,
        h("span", { className: "note-slash__title" }, item.title),
        item.badge ? h("span", { className: "note-slash__badge" }, item.badge) : null
      )
    );
  });

  if (!kids.length) {
    kids.push(h("div", { key: "empty", className: "note-slash__empty" }, LOCALE.NO_RESULTS));
  }

  const close = () => {
    const ext = editor && editor.getExtension && editor.getExtension(SuggestionMenu);
    if (ext && ext.closeMenu) ext.closeMenu();
  };

  return h(
    "div",
    { id: "bn-suggestion-menu", className: "note-slash", role: "listbox" },
    h("div", { className: "note-slash__list", ref: listRef }, kids),
    h(
      "div",
      {
        className: "note-slash__footer",
        onMouseDown: (e) => e.preventDefault(),
        onClick: close,
      },
      h("span", { className: "note-slash__footer-label" }, LOCALE.NOTE_CLOSE_MENU),
      h("span", { className: "note-slash__footer-key" }, "esc")
    )
  );
}
