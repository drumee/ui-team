// Personal task modal — create (Figma 58222:392038) and edit (58222:393597).
//
// Fields per decision C-03: Title, Description, Due date, Status, Priority.
// The Duration toggle the frames draw is deliberately NOT here (decision M-04):
// `task.create` accepts start_date, but neither the month grid nor the hour
// canvas can span a task across cells yet, so the toggle would produce a change
// the user cannot see. Add it with cell-spanning, not before.
//
// No folder picker and no assignee field — requirement §4. Assignment is also
// refused server-side for a personal-hub task, which is where it has to be
// enforced; omitting the field here is the UI half only.
const { STATUSES, PRIORITIES } = require("./helpers");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const draft = form.draft || {};
  const editing = form.mode === "edit";

  const pillRow = (className, options, selected, service, argKey) =>
    Skeletons.Box.X({
      className,
      kids: options.map((o) =>
        Skeletons.Box.X({
          className: `${pfx}__pill`,
          attrOpt: {
            "data-active": o.key === selected ? "1" : "0",
            "data-key": o.key,
          },
          bubble: 0,
          service,
          uiHandler: [ui],
          [argKey]: o.key,
          kids: [
            Skeletons.Note({
              className: `${pfx}__pill-dot`,
              styleOpt: { background: o.color },
            }),
            Skeletons.Note({
              className: `${pfx}__pill-label`,
              content: LOCALE[o.label] || o.key,
            }),
          ],
        }),
      ),
    });

  const field = (labelKey, control) =>
    Skeletons.Box.Y({
      className: `${pfx}__field`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__field-label`,
          content: LOCALE[labelKey],
        }),
        control,
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    attrOpt: { "data-form": "task" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__modal-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__modal-title`,
            // The edit frame is still titled "New personal task" in Figma —
            // a frame defect (C-09), not a spec.
            content: editing ? LOCALE.EDIT_PERSONAL_TASK : LOCALE.NEW_PERSONAL_TASK,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__modal-close`,
            ico: "cross",
            bubble: 0,
            service: "cal-close-form",
            uiHandler: [ui],
          }),
        ],
      }),

      Skeletons.Box.Y({
        className: `${pfx}__modal-body`,
        kids: [
          field(
            "TITLE",
            Skeletons.Entry({
              className: `${pfx}__input`,
              sys_pn: "form-title",
              formItem: "title",
              name: "title",
              value: draft.title || "",
              placeholder: LOCALE.TITLE,
              require: "text",
              interactive: 1,
              preselect: 1,
              mode: "commit",
              service: "cal-submit-task",
              uiHandler: [ui],
              partHandler: ui,
            }),
          ),

          field(
            "DESCRIPTION",
            Skeletons.Textarea({
              className: `${pfx}__textarea`,
              sys_pn: "form-description",
              formItem: "description",
              name: "description",
              value: draft.description || "",
              placeholder: LOCALE.TASK_NOTE_PLACEHOLDER,
              require: "any",
              rows: 3,
              // Enter must make a newline in an agenda note, not submit.
              ignoreEnter: true,
              bubble: 0,
              uiHandler: [ui],
              partHandler: ui,
            }),
          ),

          field("DUE_DATE", {
            kind: "date_picker",
            className: `${pfx}__date-input`,
            innerClass: `${pfx}__date-input-inner`,
            name: "due_date",
            placeholder: LOCALE.SELECT_DATE,
            value: draft.due_date || "",
            service: "cal-form-date",
            uiHandler: [ui],
            vendorOpt: {
              dateFormat: "Y-m-d",
              altInput: true,
              altFormat: "d/m/Y",
              // Spelled out so an unset due date stays unset — a picker that
              // seeded itself with today would stamp every task with its
              // creation date (the same trap the board documents).
              defaultDate: draft.due_date || null,
              appendTo: document.body,
            },
          }),

          field(
            "STATUS",
            pillRow(
              `${pfx}__pills`,
              STATUSES,
              draft.status || "todo",
              "cal-form-status",
              "calStatus",
            ),
          ),

          field(
            "PRIORITY",
            pillRow(
              `${pfx}__pills`,
              PRIORITIES,
              draft.priority || "medium",
              "cal-form-priority",
              "calPriority",
            ),
          ),
        ],
      }),

      Skeletons.Box.X({
        className: `${pfx}__modal-foot`,
        attrOpt: { "data-mode": editing ? "edit" : "create" },
        kids: [
          editing
            ? Skeletons.Note({
                className: `${pfx}__button ${pfx}__button--danger`,
                content: LOCALE.DELETE_TASK,
                bubble: 0,
                service: "cal-delete-task",
                uiHandler: [ui],
              })
            : null,
          Skeletons.Note({
            className: `${pfx}__button ${pfx}__button--primary`,
            content: editing ? LOCALE.UPDATE_TASK : LOCALE.CREATE_TASK,
            bubble: 0,
            service: "cal-submit-task",
            uiHandler: [ui],
          }),
        ].filter(Boolean),
      }),
    ],
  });
};
