/* ==================================================================== *
 * desk_dept_tab skeleton — B2B Org Structure, Figma 1003:172774.
 *
 * The topbar's department crumb ("[cube] Department-name v", then the "/"
 * before the workspace) and the dropdown it opens: the current department
 * with its rename pencil, "Switch Departments", one row per department, and
 * "New departments".
 * ==================================================================== */

/**
 * The 24px brand-wash tile with a cube — the department glyph everywhere the
 * frame draws one (crumb, dropdown header, dropdown rows).
 *
 * @param {String} pfx
 * @param {String} [mod] BEM modifier for the size variant
 */
function cube(pfx, mod) {
  return Skeletons.Box.X({
    active: 0,
    className: `${pfx}__cube${mod ? ` ${pfx}__cube--${mod}` : ""}`,
    kids: [Skeletons.Image.Svg({ active: 0, ico: "ph-cube", className: `${pfx}__cube-svg` })],
  });
}

/**
 * The chip: [cube] Department-name v
 *
 * Every kid is inert so the whole chip is one target: ui-core binds a click to
 * any widget whose `active` is not 0 and that handler stops propagation, so a
 * live child would swallow the press before the menu saw it.
 *
 * @param {String} pfx
 * @param {Object} dept
 */
function chip(pfx, dept) {
  return Skeletons.Box.X({
    className: `${pfx}__chip`,
    service: "open-dept-menu",
    kids: [
      cube(pfx),
      Skeletons.Note({ active: 0, className: `${pfx}__name`, content: dept.name || "" }),
      Skeletons.Image.Svg({ active: 0, ico: "ph-caret-down", className: `${pfx}__caret` }),
    ],
  });
}

/**
 * The dropdown's header: the current department, framed, with the rename
 * pencil for those who may rename it (Figma 1003:173790).
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} dept
 * @param {Boolean} canManage
 */
function head(pfx, ui, dept, canManage) {
  return Skeletons.Box.X({
    className: `${pfx}__head`,
    kids: [
      cube(pfx, "head"),
      Skeletons.Box.X({
        className: `${pfx}__head-name-box`,
        sys_pn: "dept-name-row",
        partHandler: ui,
        kids: [
          Skeletons.Note({ className: `${pfx}__head-name`, content: dept.name || "" }),
          canManage
            ? Skeletons.Button.Svg({
                ico: "ph-pencil-simple-line",
                className: `${pfx}__rename`,
                service: "rename-department",
                deptId: dept.id,
                uiHandler: [ui],
              })
            : null,
        ],
      }),
    ],
  });
}

/**
 * One "Switch Departments" row. The current one is shaded, not ticked — the
 * frame marks it with the light overlay fill alone.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} dept
 * @param {Boolean} current
 */
function row(pfx, ui, dept, current) {
  return Skeletons.Box.X({
    className: `${pfx}__row`,
    attrOpt: { "data-current": current ? "1" : "0" },
    service: "switch-department",
    deptId: dept.id,
    uiHandler: [ui],
    kids: [
      cube(pfx),
      Skeletons.Note({ active: 0, className: `${pfx}__row-name`, content: dept.name || "" }),
    ],
  });
}

/**
 * The dropdown panel.
 *
 * @param {String} pfx
 * @param {Object} ui
 * @param {Object} data a myDepartments() result
 * @param {Object} dept the department of the open workspace
 */
function panel(pfx, ui, data, dept) {
  const canManage = !!data.can_manage;
  return Skeletons.Box.Y({
    className: `${pfx}__panel`,
    kids: [
      head(pfx, ui, dept, canManage),
      Skeletons.Box.X({ className: `${pfx}__divider` }),
      Skeletons.Note({ className: `${pfx}__switch-label`, content: LOCALE.SWITCH_DEPARTMENTS }),
      Skeletons.Box.Y({
        className: `${pfx}__list`,
        kids: data.departments.map((d) => row(pfx, ui, d, String(d.id) === String(dept.id))),
      }),
      canManage
        ? Skeletons.Button.Label({
            ico: "ph-plus",
            className: `${pfx}__new`,
            label: LOCALE.NEW_DEPARTMENTS,
            service: "new-department",
            uiHandler: [ui],
          })
        : null,
    ],
  });
}

/**
 * The crumb (a Menu: chip + panel) and the "/" that separates it from the
 * workspace chip.
 *
 * Built whole on every repaint, the way the org chip is: the trigger has to be
 * the chip itself for the menu to open from it (the menu listens to events
 * raised inside its trigger), so the department's name cannot be fed into a
 * part afterwards.
 *
 * @param {Object} ui
 * @param {Object} data a myDepartments() result
 * @param {Object} dept the department of the open workspace
 */
module.exports = function (ui, data, dept) {
  const pfx = ui.fig.family;
  return [
    Skeletons.Menu({
      className: `${pfx}__wrapper`,
      direction: _a.down,
      // Explicit, like every menu in the topbar: without it the menu falls
      // back to Visitor.timeout() milliseconds read as gsap seconds.
      duration: 0.01,
      opening: _e.click,
      // A row click must not close it by itself — the widget closes it after
      // acting, so the rename pencil can work inside the panel.
      persistence: _a.always,
      sys_pn: "dept-menu",
      partHandler: [ui],
      trigger: chip(pfx, dept),
      items: Skeletons.Box.Y({
        className: `${pfx}__items`,
        kids: [panel(pfx, ui, data, dept)],
      }),
    }),
    Skeletons.Note({ className: `${pfx}__sep`, content: "/" }),
  ];
};
