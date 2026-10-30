const withFileSwitcher = require("builtins/player/widget/file-switcher/frame");
// ===========================================================
//  Notion-style Note (BlockNote) window — header + the body
//  the editor mounts into.
// ===========================================================

/**
 * Deliberately NOT `window/skeleton/content/main`, which the other editors
 * reuse: that helper fills the body with `gridFilesBrowser(ui)`, the folder
 * file-browser. An editor has no files to browse, so those kids render as a
 * `core-failover` block that sits above the editor and eats half the window.
 *
 * Everything else that helper provides — the tooltips and modal-dialog
 * wrappers the window chrome expects — is kept, so context menus and dialogs
 * behave exactly as they do in any other window.
 */
function __skl_editor_blocknote(_ui_) {
  const pfx = _ui_.fig.family;
  const group = _ui_.fig.group;

  const header = Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__header ${group}__header`,
    sys_pn: "window-header",
    service: _e.raise,
    kidsOpt: {
      radio: _a.on,
      uiHandler: _ui_,
    },
    kids: [require("./topbar")(_ui_)],
  });

  // The page head (Lexis's Figma, 2026-10-22), above the editor and never
  // inside it: React owns the editor element (createRoot), so nothing of ours
  // can live in there. Each slot is filled by ../page.
  const slot = (sys_pn, className) =>
    Skeletons.Box.Y({ className: `${pfx}__${className}`, sys_pn, partHandler: _ui_ });

  // The icon and its picker share a row so the picker can hang at
  // `top: 100%` under the icon, whatever the title below measures.
  const iconRow = Skeletons.Box.Y({
    className: `${pfx}__icon-row`,
    kids: [
      slot("page-icon", "icon-slot"),
      Skeletons.Wrapper.Y({ className: `${pfx}__icon-picker`, name: "icon-picker" }),
    ],
  });

  // Notion's defining first interaction is typing the page title, so the note
  // carries one in the page itself rather than only in the window chrome.
  const title = Skeletons.Box.X({
    className: `${pfx}__title-row`,
    kids: [
      Skeletons.Entry({
        className: `${pfx}__title-input`,
        sys_pn: "page-title",
        name: _a.filename,
        value: _ui_.mget(_a.filename) || "",
        placeholder: LOCALE.NOTE_NEW_PAGE,
        // A reader cannot rename: a name they could type but not save would
        // show, then vanish. In a share an attempt meets the gate instead.
        readonly: _ui_.isViewOnly() ? 1 : 0,
        mode: "commit",
        service: "rename-note",
        uiHandler: [_ui_],
        partHandler: _ui_,
      }),
    ],
  });

  const head = Skeletons.Box.Y({
    className: `${pfx}__head`,
    kids: [slot("page-actions", "actions"), iconRow, title, slot("page-comments", "comments-slot")],
  });

  // The whole page scrolls as one — cover, head and text — the way a page
  // does; the editor surface grows with its content.
  const body = Skeletons.Box.Y({
    className: `${pfx}__body ${group}__body`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__cover-row`,
        kids: [
          slot("page-cover", "cover-slot"),
          Skeletons.Wrapper.Y({ className: `${pfx}__cover-popup-wrapper`, name: "cover-popup" }),
          // The cover's file picker, mounted for the window's lifetime so both
          // "Add cover" and the popup's Upload open it inside the click.
          // Skeletons.FileSelector forces its own part name, "fileselector",
          // over any sys_pn given here — ../page reaches it by that name.
          Skeletons.FileSelector({
            className: `${pfx}__cover-file`,
            accept: "image/*",
            bubble: 0,
            partHandler: _ui_,
          }),
        ],
      }),
      head,
      Skeletons.Box.Y({
        className: `${pfx}__surface`,
        sys_pn: _a.content,
      }),
    ],
  });

  const tooltips = Skeletons.Wrapper.Y({
    className: `${group}__wrapper-container`,
    name: "tooltips",
  });

  const dialog = Skeletons.Wrapper.Y({
    className: `${group}__wrapper--modal dialog__wrapper--modal ${pfx}`,
    name: "dialog",
  });

  // In the Open-File Switcher frame, like every other viewer and editor opened
  // from a folder: the folder's recently viewed and other files, left of the
  // note (Figma). The frame leaves the root as is where the panel has no
  // meaning — mobile, a share page, a node with no folder.
  return withFileSwitcher(
    _ui_,
    Skeletons.Box.Y({
      debug: __filename,
      className: `${pfx}__main ${group}__main`,
      radio: _a.parent,
      kids: [header, tooltips, body, dialog],
    })
  );
}
module.exports = __skl_editor_blocknote;
