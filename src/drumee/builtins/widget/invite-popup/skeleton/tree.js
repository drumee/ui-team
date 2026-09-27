/**
 * Rows of the "Invite to" tree (Figma 785:110823): department rows that expand
 * into their workspaces, workspace rows with a member pill, a role pill and a
 * checkbox.
 *
 * Rebuilt wholesale on every change: the list is a few dozen rows, and one
 * full feed is simpler than patching three states per row. The controller
 * re-feeds its `tree` part with rows().
 */
const { roleItems, ROLE_ICONS } = require("builtins/skeleton/toolkit/permission");
const folderIcon = require("media/grid/template/folder");
const { deptState } = require("../tree");

const DEFAULT_ROLE = "edit";

/**
 * A checkbox whose whole look is `data-state` (0 | 1 | "mixed"), drawn in the
 * skin. The tick is always in the DOM and shown by CSS, never swapped.
 */
const check = (pfx, dataset, service, ui) =>
  Skeletons.Box.X({
    className: `${pfx}__check`,
    service,
    uiHandler: [ui],
    dataset,
    kidsOpt: { active: 0 },
    kids: [Skeletons.Button.Svg({ ico: "editbox_checkmark", className: `${pfx}__check-tick` })],
  });

const pill = (pfx, num, word, extra) =>
  Skeletons.Box.X({
    className: `${pfx}__pill ${extra || ""}`.trim(),
    active: 0,
    kids: [Skeletons.Note({ className: `${pfx}__pill-num`, content: String(num) }), word],
  });

const caret = (pfx) =>
  Skeletons.Button.Svg({ ico: "apps-caret-down", className: `${pfx}__caret`, active: 0 });

/**
 * The grey "Admin ⌄" pill and its menu. The menu keeps the class names the
 * controller's capture-phase mousedown resolves (`__role-option` + data-id)
 * and the ones reward-flow's spotlight unions (`__role-options`).
 */
function rolePill(ui, ws, roleId) {
  const pfx = ui.fig.family;
  const role =
    roleItems.find((r) => r.value === roleId) ||
    roleItems.find((r) => r.value === DEFAULT_ROLE);
  return Skeletons.Box.Y({
    className: `${pfx}__role-cell`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__role-select`,
        service: "toggle-role",
        uiHandler: [ui],
        dataset: { hub_id: ws.hub_id },
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            className: `${pfx}__role-select-label`,
            sys_pn: `role-label:${ws.hub_id}`,
            partHandler: ui,
            content: role.label,
          }),
          caret(pfx),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__role-options`,
        sys_pn: `role-options:${ws.hub_id}`,
        partHandler: ui,
        dataset: { hub_id: ws.hub_id, state: 0 },
        kids: roleItems.map((r) =>
          Skeletons.Box.X({
            className: `${pfx}__role-option`,
            // Revealed on :hover by the skin — ui-core only toggles it on click.
            tooltips: r.description
              ? { content: r.description, className: "role-option-tooltip" }
              : undefined,
            dataset: { id: r.value, hub_id: ws.hub_id, checked: r.value === role.value ? 1 : 0 },
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Button.Svg({ ico: ROLE_ICONS[r.value], className: `${pfx}__role-option-icon` }),
              Skeletons.Note({ className: `${pfx}__role-option-label`, content: r.label }),
            ],
          }),
        ),
      }),
    ],
  });
}

function wsRow(ui, ws, state) {
  const pfx = ui.fig.family;
  const main = [
    // Element + content: the folder template emits MARKUP, not a sprite name.
    Skeletons.Element({
      className: `${pfx}__ws-icon`,
      content: folderIcon({
        // `|| ""`: an undefined area reaches the markup as `folder-shape undefined`.
        area: ws.area || "",
        filetype: _a.hub,
        role: "desk",
        widgetId: _.uniqueId("invite-ws-"),
        isAttachment: 1,
      }),
    }),
    Skeletons.Note({ className: `${pfx}__row-name`, content: ws.name }),
  ];
  // No pill when the count is unknown (no organisation): a "0" would be a lie.
  if (ws.members != null) {
    main.push(
      pill(
        pfx,
        ws.members,
        Skeletons.Button.Svg({ ico: "ph-users", className: `${pfx}__pill-ico`, active: 0 }),
        `${pfx}__members`,
      ),
    );
  }
  return Skeletons.Box.X({
    className: `${pfx}__ws-row`,
    dataset: { hub_id: ws.hub_id },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__row-box`,
        service: "toggle-ws",
        uiHandler: [ui],
        dataset: { hub_id: ws.hub_id },
        kidsOpt: { active: 0 },
        kids: [...main, caret(pfx)],
      }),
      rolePill(ui, ws, state.roles.get(ws.hub_id) || DEFAULT_ROLE),
      check(pfx, { hub_id: ws.hub_id, state: state.checked.has(ws.hub_id) ? 1 : 0 }, "toggle-ws", ui),
    ],
  });
}

function deptRow(ui, dept, state) {
  const pfx = ui.fig.family;
  const n = dept.workspaces.length;
  const open = state.expanded.has(dept.id);
  const word = Skeletons.Note({
    className: `${pfx}__pill-word`,
    content: n === 1 ? LOCALE.INVITE_WORKSPACE_ONE : LOCALE.INVITE_WORKSPACE_OTHER,
  });
  const kids = [
    Skeletons.Box.X({
      className: `${pfx}__dept-head`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__row-box`,
          service: "expand-dept",
          uiHandler: [ui],
          dataset: { dept: dept.id, open: open ? 1 : 0 },
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__dept-icon`,
              active: 0,
              kids: [Skeletons.Button.Svg({ ico: "ph-cube", active: 0 })],
            }),
            Skeletons.Note({ className: `${pfx}__row-name`, content: dept.name }),
            pill(pfx, n, word),
            caret(pfx),
          ],
        }),
        check(pfx, { dept: dept.id, state: deptState(dept, state.checked) }, "toggle-dept", ui),
      ],
    }),
  ];
  if (open) {
    kids.push(
      Skeletons.Box.Y({
        className: `${pfx}__dept-children`,
        kids: dept.workspaces.map((w) => wsRow(ui, w, state)),
      }),
    );
  }
  return Skeletons.Box.Y({ className: `${pfx}__dept-row`, dataset: { dept: dept.id }, kids });
}

/**
 * @param {Object} ui    the popup (reads fig.family)
 * @param {Object} tree  tree.buildTree() result
 * @param {{checked:Set, expanded:Set, roles:Map}} state
 * @returns {Array} descriptors for the `tree` part
 */
function rows(ui, tree, state) {
  const pfx = ui.fig.family;
  if (!tree.departments.length && !tree.ungrouped.length) {
    return [Skeletons.Note({ className: `${pfx}__tree-empty`, content: LOCALE.INVITE_NO_WORKSPACE })];
  }
  return [
    ...tree.departments.map((d) => deptRow(ui, d, state)),
    ...tree.ungrouped.map((w) => wsRow(ui, w, state)),
  ];
}

module.exports = { rows, check, DEFAULT_ROLE };
