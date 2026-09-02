/**
 * The Files grid with nothing in it — Figma 176:42043 (frame 176:42052).
 *
 * A workspace whose Files tab is empty used to show an empty box: a filter bar
 * over blank space, with no hint of what the tab is for or of how to put
 * something in it. The design answers both — it names what makes files here
 * different from files anywhere else, and puts the three ways of adding one
 * under the sentence.
 *
 * Keyed on `ui.fig.group` ("window"), like the grid it sits beside: this is the
 * folder window's empty state, and the same grid skeleton serves every window
 * that renders one.
 *
 * The three actions are REAL — they raise the services the window already
 * handles for the same three gestures. The tour draws a picture of this pane
 * (modules/desk/tutorial/skeleton/toolkit/files.js) from the same frame; that
 * one is scenery and this one is the product.
 */

const { createRows } = require("../../toolkit/new-menu-rows");

const ACTIONS = [
  {
    // The same flow the topbar's + New menu offers, and the same one the
    // migrate tour teaches.
    key: "migrate",
    label: () => LOCALE.MIGRATE_FROM_GDRIVE,
    service: "launch-gdrive-migration",
    primary: true,
  },
  // Opens the create list under itself rather than raising a service — see
  // createMenu below.
  { key: "new", label: () => LOCALE.NEW, ico: "topbar-add", menu: true },
  // `_e.upload`, the same constant the "+ New" menu's "From device" row raises
  // (skeleton/toolkit newMenu importRows) — not the literal "upload" this used
  // to carry.
  //
  // The literal reached the handler only by ACCIDENT. `_e` is a
  // createSafeObject proxy over src/drumee/lex/event.js, and that proxy answers
  // a missing key with the key's own name (@drumee/ui-essentials utils). There
  // is no `upload` in the lexicon, so `_e.upload` evaluates to "upload" and the
  // two happened to agree. Add `upload` to lex/event.js with any other value —
  // which is precisely what that file is for — and the row keeps working while
  // this button goes dead, with nothing to see: `case _e.upload` simply stops
  // matching and the click falls through to `default`.
  { key: "upload", label: () => LOCALE.UPLOAD, service: _e.upload, ico: "upload-simple" },
];

/**
 * @param {Object} ui the window rendering the grid
 * @returns {Object} the empty state, hidden until the grid says it is empty
 */
module.exports = function (ui) {
  const p = `${ui.fig.group}__fe`;
  const cnDropdown = `${ui.fig.group}-button__dropdown-menu`;

  const button = (a) => {
    const opt = {
      className: `${p}-btn ${p}-btn--${a.primary ? "primary" : "ghost"}`,
      kids: [
        a.ico
          ? Skeletons.Image.Svg({ active: 0, ico: a.ico, className: `${p}-btn-ico` })
          : null,
        Skeletons.Note({ active: 0, className: `${p}-btn-label`, content: a.label() }),
      ].filter(Boolean),
    };
    // A Menu TRIGGER carries NO service, deliberately. ui-core opens the menu
    // from the trigger itself; a service here would ALSO reach the window's
    // onUiEvent, and `open-new-menu` there opens the topbar's copy of this menu
    // — so one click would raise two panels, one of them at the top of the
    // window. Same reason the desk topbar's "+ New" button carries none
    // (modules/desk/index.js, case "addmenu").
    if (!a.menu) {
      opt.service = a.service;
      opt.uiHandler = [ui];
    }
    return Skeletons.Box.X(opt);
  };

  /**
   * The create list, opened by the ghost "New" beside it.
   *
   * The topbar has its own copy of this menu (skeleton/toolkit newMenu), and
   * `open-new-menu` used to hand this button off to it — which opened a panel
   * anchored up in the toolbar, with its create flyout still closed, in answer
   * to a click in the middle of an empty pane. This one opens under the button
   * that was pressed.
   *
   * The four CREATE rows only: this hero already carries Migrate and Upload as
   * buttons of their own, which is exactly what the topbar menu's two import
   * rows offer, so including them would put a second copy of both next to
   * themselves.
   *
   * Leaf rows raise the services the window already handles (`add-folder`,
   * `new-document`), and their handlers close the menu through
   * closeNewMenu(cmd) → getParentByKind(KIND.menu.topic), which resolves to
   * THIS menu — so nothing there needs to know which surface was used.
   */
  const createMenu = (trigger) => ({
    kind: KIND.menu.topic,
    // BOTH classes. `__wrapper` is the signal two ancestors already release
    // their clipping on while a "+ New" menu is open — the files column
    // (folder/skin/index.scss `&__files-panel:has(…[data-state="1"])`, which
    // is `overflow: hidden`) and the hero itself (window/skin/common.scss,
    // which scrolls). Naming the wrapper the way the topbar's copy does means
    // neither needs a second rule for this surface. `-menu` carries the
    // visuals, since every rule for the topbar's copy is scoped to
    // `.window-folder-topbar__new-ctrl` and cannot reach here.
    className: `${cnDropdown}__wrapper ${p}-menu`,
    flow: _a.y,
    opening: _e.click,
    trigger,
    items: Skeletons.Box.Y({
      className: `${cnDropdown}__create-submenu`,
      kids: createRows(ui),
    }),
  });

  const action = (a) => (a.menu ? createMenu(button(a)) : button(a));

  return Skeletons.Box.Y({ active: 0,
    className: `${p}-hero`,
    sys_pn: "files-empty",
    partHandler: ui,
    kids: [
      Skeletons.Note({ active: 0, className: `${p}-title`, content: LOCALE.FILES_EMPTY_TITLE }),
      Skeletons.Note({ active: 0, className: `${p}-desc`, content: LOCALE.FILES_EMPTY_DESC }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-actions`,
        kids: ACTIONS.map(action),
      }),
    ],
  });
};
