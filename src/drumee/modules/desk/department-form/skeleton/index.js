/* ==================================================================== *
 * desk_department_form skeleton — "Create new department", B2B Org
 * Structure Figma 900:151281.
 *
 * Header (title, hint, close), the organisation it lands in (read-only), the
 * department name, then one primary button.
 * ==================================================================== */

/**
 * @param {Object} ui
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__header-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.CREATE_NEW_DEPARTMENT,
          }),
          Skeletons.Note({
            className: `${pfx}__subtitle`,
            content: LOCALE.CREATE_DEPARTMENT_HINT,
          }),
        ],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });

  // The organisation the department will belong to. Read-only: a department
  // is created in the caller's own organisation and nowhere else (the server
  // takes the domain from the session, not from the form), so an editable
  // field here would offer a choice that does not exist.
  const orgField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.ORGANIZATION,
      }),
      Skeletons.Note({
        className: `${pfx}__readonly`,
        content: Organization.name() || "",
      }),
    ],
  });

  const nameField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.DEPARTMENT_NAME,
      }),
      Skeletons.Entry({
        className: `${pfx}__input`,
        sys_pn: "department-name",
        formItem: _a.name,
        placeholder: LOCALE.TYPE_THE_NAME,
        require: "any",
        mode: _a.commit,
        preselect: 1,
        service: "create-department",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        sys_pn: "error",
        partHandler: [ui],
        className: `${pfx}__field-error`,
        state: 0,
        content: "",
      }),
    ],
  });

  const footer = Skeletons.Box.Y({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Button.Label({
        className: `${pfx}__submit`,
        label: LOCALE.CREATE,
        service: "create-department",
        uiHandler: [ui],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [header, orgField, nameField, footer],
  });
};
