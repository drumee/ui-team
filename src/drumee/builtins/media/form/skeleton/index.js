/**
 * The real Create-new-workspace dialog.
 *
 * Its LOOK is the tour's, deliberately. The `workspace` tour spends five
 * screens teaching this dialog block by block
 * (desk/tutorial/skeleton/toolkit/workspace-dialog, Figma 176:40762 →
 * 176:41391, component 85:42209) and its last screen renders a WORKING copy of
 * it — so a user who has just been walked through that card and then opens
 * "+ New → Workspace" must land on the same card. It used to be a different,
 * smaller, denser dialog: a 360px panel with a subtitle and a rule under the
 * header, 8px type descriptions, and per-type selection tints. Every one of
 * those differences read as a second, unrelated form.
 *
 * What is NOT copied from the tour is anything the tour cannot have, because
 * it is a mock: the inline quota block, the `data-state` selection the radio
 * behaviour drives, and the enter/exit animation (skin).
 */

// The area-tinted workspace shape — the same art the desk draws a workspace
// with, and the same art the tour draws these three rows with. It returns an
// HTML STRING, hence Element + content rather than Image.Svg + ico.
//
// It replaces three unrelated glyphs (desktop_group / desktop_sharing /
// account_padlock) that named the three types by picture rather than showing
// what a workspace of that type LOOKS like once it exists — which is what the
// user will actually go looking for in the sidebar afterwards.
const folderArt = require("media/grid/template/folder");

/**
 * The workspace types this dialog offers, in the design's order.
 *
 * `area` is the real area token, so each row is tinted the colour the product
 * would give that workspace rather than one picked to match a screenshot.
 * `name` stays the SERVICE's word for the type (team / share / personal) —
 * libs/create-workspace branches on it and the tour keeps its own map at its
 * own boundary.
 *
 * The descriptions are WS_TYPE_*_HINT, not the *_WORKSPACE_HINT keys this used
 * to render: those hold the TOUR's callout sentences ("Restricted to only
 * internal team"), so printing them inside the dialog says the same sentence
 * twice on the screen where the callout is up. Same reasoning, same keys, as
 * the tour's own rows.
 */

// PERSONAL IS DELIBERATELY NOT HERE. A personal workspace is not a workspace
// at all in the product's terms — libs/create-workspace makes it a plain
// folder at the user's home root, with no hub, no area, no membership and no
// follow-up access panel — and offering it beside two real workspace types
// mis-sold what the user was creating. Removed from the dialog rather than
// from the creation library: the `personal` branch there still serves the
// product tour's own create screen (tutorial/skeleton/toolkit/workspace-dialog,
// which teaches all three types and has a tour step per row), and the existing
// personal workspaces users already own must keep working everywhere else —
// the switcher still lists and opens them under "Personal".
const STATUS_OPTIONS = [
  {
    area: _a.private,
    label: LOCALE.INTERNAL_WORKSPACE,
    desc: LOCALE.WS_TYPE_INTERNAL_HINT,
    initial: 1,
    name: "team",
  },
  {
    area: _a.share,
    label: LOCALE.EXTERNAL_WORKSPACE,
    desc: LOCALE.WS_TYPE_EXTERNAL_HINT,
    initial: 0,
    name: "share",
  },
];

function statusOption(ui, opt) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__option`,
    state: opt.initial,
    service: "select-status",
    dataset: { value: opt.value, type: opt.name },
    uiHandler: [ui],
    formItem: opt.name,
    radio: `${ui._id}`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__option-left`,
        active: 0,
        kidsOpt: { active: 0 },
        kids: [
          // `isAttachment: 1` suppresses the kebab the grid puts on a real
          // tile; `filetype: hub` is what earns the area emblem.
          Skeletons.Element({
            active: 0,
            className: `${pfx}__option-ico ${opt.area}`,
            content: folderArt({
              area: opt.area,
              filetype: _a.hub,
              role: "desk",
              widgetId: _.uniqueId("form-folder-opt-"),
              isAttachment: 1,
            }),
          }),
          Skeletons.Box.Y({
            className: `${pfx}__option-info`,
            active: 0,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Note({
                className: `${pfx}__option-label`,
                content: opt.label,
              }),
              Skeletons.Note({
                className: `${pfx}__option-desc`,
                content: opt.desc,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Element({ className: `${pfx}__option-circle` }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;

  // Heading and close, nothing else.
  //
  // The subtitle ("Specify a name for your new organization unit.") and the
  // hairline under it are gone: the design's header is a 24px heading and a
  // 20px cross, and the sentence was explaining a field that is already
  // labelled "Workspace name" one line below it. The rule mattered when the
  // header carried two lines of copy; with one line the 24px stack gap does
  // that job.
  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.CREATE_NEW_WORKSPACE,
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: "close",
        uiHandler: [ui],
      }),
    ],
  });

  const nameField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.WORKSPACE_NAME,
      }),
      Skeletons.Entry({
        className: `${pfx}__input`,
        sys_pn: "folder-name",
        formItem: "filename",
        placeholder: LOCALE.WORKSPACE_NAME_PLACEHOLDER,
        require: "text",
        mode: "commit",
        preselect: 1,
      }),
      // Inline validation message, rendered directly below the input. Hidden
      // until _submit populates it (see form/index.js _setNameError).
      Skeletons.Note({
        className: `${pfx}__input-error`,
        sys_pn: "name-error",
        content: "",
      }),
      // Slot for the quota-exceeded block. Empty for every other outcome.
      //
      // A separate slot rather than reusing name-error: that one is a Note, so
      // it can only hold a sentence, and the workspace limit is not a problem
      // with the NAME the user typed. Putting "you have used all your
      // workspaces" under the field, in the field's error style, would read as
      // "that name is invalid" — which is why this sits below it with its own
      // presentation and its own way out.
      Skeletons.Box.Y({
        className: `${pfx}__quota-slot`,
        sys_pn: "quota-slot",
      }),
    ],
  });

  const statusField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.WORKSPACE_TYPE,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__options`,
        kids: STATUS_OPTIONS.map((opt) => statusOption(ui, opt)),
      }),
    ],
  });

  // Full-width, directly in the stack — no footer box.
  //
  // The wrapper existed to add 4px over the 20px stack gap; the design's gap
  // is 24 and the button is simply the last row of it. `sys_pn` is new: the
  // submit has to be reachable so _submit can stamp `data-pending` on it while
  // the create is in flight (skin draws the spinner off that).
  const submit = Skeletons.Button.Label({
    className: `${pfx}__submit`,
    sys_pn: "submit",
    label: LOCALE.CREATE,
    service: "create-folder",
    uiHandler: [ui],
    dataset: { pending: 0 },
  });

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [header, nameField, statusField, submit],
  });
};
