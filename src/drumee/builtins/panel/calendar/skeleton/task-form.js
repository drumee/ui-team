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
const dateField = require("./date-field");
const attachments = require("./attachments");

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
          // Both kids cover almost the whole pill, and a kid left interactive
          // stopPropagation()s the click before this service can fire — so
          // status/priority only changed when the click landed on the pill's
          // 12px of side padding. Same trap the toolbar documents three times.
          kidsOpt: { active: 0 },
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

  // `required` names the draft key the field must fill. The field then
  // carries data-field / data-required, and an error line that stays hidden
  // until the controller stamps data-error on a failed submit
  // (index.js _validateRequired).
  const field = (labelKey, control, required) =>
    Skeletons.Box.Y({
      className: `${pfx}__field`,
      attrOpt: required
        ? { "data-field": required, "data-required": "1", "data-error": "0" }
        : {},
      kids: [
        Skeletons.Note({
          className: `${pfx}__field-label`,
          content: LOCALE[labelKey],
        }),
        control,
        required
          ? Skeletons.Note({
              className: `${pfx}__field-error`,
              content: LOCALE.REQUIRE_THIS_FIELD,
            })
          : null,
      ].filter(Boolean),
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
              // NO `interactive: 1` here. With mode:"commit" the base Entry
              // still fires its own `service` on EVERY printable keyup when
              // interactive is on (widgets/entry/input `_onKeyup` falls
              // through to triggerHandlers with __inputStatus:"interactive").
              // That turned each letter typed into the title into a
              // `cal-submit-task`, so typing "abc" posted task.create three
              // times and the user ended up with tasks "a", "ab" and "abc"
              // without ever pressing Enter. Enter alone still commits.
              preselect: 1,
              mode: "commit",
              service: "cal-submit-task",
              uiHandler: [ui],
              partHandler: ui,
            }),
            "title",
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

          field("ATTACHMENTS", attachments(ui)),

          field(
            "DUE_DATE",
            dateField(ui, { name: "due_date", value: draft.due_date }),
          ),

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

      // Delete (destructive, pushed left) · Cancel · confirm — the footer both
      // the Task tab's create modal and the Meet tab's schedule modal use.
      // Cancel is not decoration here: this dialog's only other way out was the
      // ✕ in the header, which neither of those two relies on alone.
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
            className: `${pfx}__button ${pfx}__button--neutral`,
            content: LOCALE.CANCEL,
            bubble: 0,
            service: "cal-close-form",
            uiHandler: [ui],
          }),
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
