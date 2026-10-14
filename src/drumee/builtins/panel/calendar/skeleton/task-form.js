// Personal task modal — create (Figma 1693:198659) and edit (1693:198307,
// "Card detail").
//
// Left: Task title, Description, Subtasks, Files. Right: Status, Priority,
// Start → End date, then the actions — Cancel · Create, or Delete · Cancel ·
// Update — at the foot of that column, where both frames put them. The task
// sits in its End date's cell (due_date): the grids do not draw a task across
// several cells, so Start only bounds the pickers and travels with the row.
//
// The edit frame drops the Title field and heads the card with the task's
// name. The heading follows the frame; the field stays, or a task could no
// longer be renamed. The share icon the edit frame draws beside ✕ is not
// drawn: what it would share is not specified.
//
// No assignee anywhere, the avatar slot the frames draw on a subtask row
// included: a personal task has nobody else to assign. The server does not
// refuse it (task.update_assignee accepts a personal-hub task), so leaving the
// control out is the whole of it.
const { STATUSES, PRIORITIES } = require("./helpers");
const dateField = require("./date-field");
const { taskFiles } = require("./attachments");

// ── subtasks ─────────────────────────────────────────────────────────────────
// draft.subtasks rows: { localKey, id?, title, status, priority, due_date,
// start_date, busy?, error? }. A row with an id exists on the server and shows
// its name; one without is typed in place (its input is named
// `subtask:<localKey>` so index.js can read it back). The open Priority /
// Status menu is form.subMenu ({ key, kind }); the done columns
// (task.column_list is_done) are form.doneKeys.

function subtaskRow(ui, s, menu) {
  const pfx = ui.fig.family;
  const key = s.localKey;

  const cell = (kind, list, value) => {
    const open = !!menu && menu.key === key && menu.kind === kind;
    const current = list.find((o) => o.key === value);
    return Skeletons.Box.X({
      className: `${pfx}__subtask-cell`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__subtask-chip`,
          attrOpt: { "data-kind": kind, "data-open": open ? "1" : "0" },
          bubble: 0,
          service: "cal-subtask-menu",
          uiHandler: [ui],
          calSubKey: key,
          calSubKind: kind,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Note({
              className: `${pfx}__subtask-chip-label`,
              content: current
                ? LOCALE[current.label] || current.key
                : LOCALE[kind === "status" ? "STATUS" : "PRIORITY"],
            }),
            Skeletons.Image.Svg({ ico: "apps-caret-down", className: `${pfx}__subtask-chip-ico` }),
          ],
        }),
        open
          ? Skeletons.Box.Y({
              className: `${pfx}__subtask-menu`,
              kids: list.map((o) =>
                Skeletons.Box.X({
                  className: `${pfx}__subtask-option`,
                  attrOpt: { "data-active": o.key === value ? "1" : "0" },
                  bubble: 0,
                  service: "cal-subtask-set",
                  uiHandler: [ui],
                  calSubKey: key,
                  calSubKind: kind,
                  calValue: o.key,
                  kidsOpt: { active: 0 },
                  kids: [
                    Skeletons.Note({ className: `${pfx}__pill-dot`, styleOpt: { background: o.color } }),
                    Skeletons.Note({ className: `${pfx}__subtask-option-label`, content: LOCALE[o.label] || o.key }),
                  ],
                }),
              ),
            })
          : null,
      ].filter(Boolean),
    });
  };

  return Skeletons.Box.X({
    className: `${pfx}__subtask`,
    attrOpt: {
      "data-key": key,
      "data-busy": s.busy ? "1" : "0",
      "data-error": s.error ? "1" : "0",
    },
    kids: [
      s.id
        ? Skeletons.Note({ className: `${pfx}__subtask-name`, content: s.title || "" })
        : Skeletons.Entry({
            className: `${pfx}__subtask-input`,
            name: `subtask:${key}`,
            value: s.title || "",
            placeholder: LOCALE.SUBTASK_PLACEHOLDER,
            // Enter saves the row (edit mode) — see the title Entry for why
            // this is commit-only and never `interactive`.
            mode: "commit",
            service: "cal-subtask-commit",
            calSubKey: key,
            uiHandler: [ui],
          }),
      cell("priority", PRIORITIES, s.priority),
      cell("status", STATUSES, s.status),
      Skeletons.Box.X({
        className: `${pfx}__subtask-end`,
        kids: [
          Skeletons.Button.Svg({
            className: `${pfx}__subtask-remove`,
            ico: "cross",
            bubble: 0,
            service: "cal-subtask-remove",
            uiHandler: [ui],
            calSubKey: key,
            attrOpt: { "aria-label": LOCALE.REMOVE },
          }),
        ],
      }),
    ],
  });
}

// Progress rail ("N% Done") and the rows — the part index.js re-feeds after
// every subtask change.
function subtaskBody(ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const subs = (form.draft && form.draft.subtasks) || [];
  const done = new Set(form.doneKeys || []);
  const total = subs.length;
  const pct = total ? Math.round((subs.filter((s) => done.has(s.status)).length / total) * 100) : 0;
  return [
    // A failed read of the subtasks or of the done columns: said here instead
    // of an empty list or a 0% that would be untrue.
    form.subtaskLoadError
      ? Skeletons.Note({ className: `${pfx}__subtask-error`, content: LOCALE.CAL_SUBTASKS_LOAD_FAILED })
      : total
      ? Skeletons.Box.X({
          className: `${pfx}__subtask-progress`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__subtask-track`,
              kids: [Skeletons.Box.X({ className: `${pfx}__subtask-fill`, styleOpt: { width: `${pct}%` } })],
            }),
            Skeletons.Note({ className: `${pfx}__subtask-pct`, content: `${pct}% ${LOCALE.DONE}` }),
          ],
        })
      : null,
    Skeletons.Box.Y({
      className: `${pfx}__subtask-list`,
      kids: subs.map((s) => subtaskRow(ui, s, form.subMenu)),
    }),
  ].filter(Boolean);
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const draft = form.draft || {};
  const editing = form.mode === "edit";

  const pillRow = (kind, options, selected, service, argKey) =>
    Skeletons.Box.X({
      className: `${pfx}__pills ${pfx}__pills--${kind}`,
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
            // A status pill shows its dot; a priority pill hides it and the
            // lit one is filled with that colour (skin, __pills--priority).
            Skeletons.Note({
              className: `${pfx}__pill-dot`,
              styleOpt: { background: o.color },
            }),
            Skeletons.Note({
              className: `${pfx}__pill-label`,
              content: LOCALE[o.label] || o.key,
              // The skin reserves the label's BOLD width from this (::after),
              // so lighting a pill never changes its width. See __pill-label.
              attrOpt: { "data-label": LOCALE[o.label] || o.key },
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

  // One end of the Start → End pair: each picker is bounded by the other's
  // date, and the controller re-bounds the other one after a pick.
  const range = { start_date: draft.start_date, due_date: draft.due_date };
  const dateBox = (name) =>
    Skeletons.Box.X({
      className: `${pfx}__date-box`,
      kids: [
        dateField(ui, { name, value: draft[name], range, placeholder: LOCALE.DATE_PLACEHOLDER }),
        Skeletons.Image.Svg({ ico: "top-calendar", className: `${pfx}__date-ico` }),
      ],
    });

  const button = (variant, content, service) =>
    Skeletons.Note({
      className: `${pfx}__button ${pfx}__button--${variant}`,
      content,
      bubble: 0,
      service,
      uiHandler: [ui],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    attrOpt: { "data-form": "task", "data-mode": editing ? "edit" : "create" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__modal-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__modal-title`,
            content: editing ? draft.title || LOCALE.EDIT_PERSONAL_TASK : LOCALE.NEW_TASK,
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

      // Two columns; the skin stacks them on a narrow screen.
      Skeletons.Box.X({
        className: `${pfx}__modal-body ${pfx}__modal-body--split`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__modal-col ${pfx}__modal-col--main`,
            kids: [
              field(
                "TASK_TITLE",
                Skeletons.Entry({
                  className: `${pfx}__input`,
                  sys_pn: "form-title",
                  formItem: "title",
                  name: "title",
                  value: draft.title || "",
                  placeholder: LOCALE.TASK_TITLE,
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

              Skeletons.Box.Y({
                className: `${pfx}__field ${pfx}__subtasks`,
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}__subtasks-head`,
                    kids: [
                      Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.SUBTASKS }),
                      Skeletons.Button.Svg({
                        className: `${pfx}__subtasks-add`,
                        ico: "app-add",
                        bubble: 0,
                        service: "cal-subtask-add",
                        uiHandler: [ui],
                        attrOpt: { "aria-label": LOCALE.CREATE_SUBTASK },
                      }),
                    ],
                  }),
                  Skeletons.Box.Y({
                    className: `${pfx}__subtasks-body`,
                    sys_pn: "form-subtasks",
                    partHandler: ui,
                    kids: subtaskBody(ui),
                  }),
                ],
              }),

              field("FILES", taskFiles(ui)),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__modal-col ${pfx}__modal-col--side`,
            kids: [
              field(
                "STATUS",
                pillRow("status", STATUSES, draft.status || "todo", "cal-form-status", "calStatus"),
              ),

              field(
                "PRIORITY",
                pillRow("priority", PRIORITIES, draft.priority || "medium", "cal-form-priority", "calPriority"),
              ),

              Skeletons.Box.X({
                className: `${pfx}__dates`,
                kids: [
                  field("START_DATE", dateBox("start_date")),
                  Skeletons.Image.Svg({ ico: "arrow-right", className: `${pfx}__dates-arrow` }),
                  // Required: a task with no End date has no cell to sit in.
                  field("END_DATE", dateBox("due_date"), "due_date"),
                ],
              }),

              Skeletons.Box.X({
                className: `${pfx}__modal-foot`,
                attrOpt: { "data-mode": editing ? "edit" : "create" },
                kids: [
                  editing ? button("danger", LOCALE.DELETE, "cal-delete-task") : null,
                  button("neutral", LOCALE.CANCEL, "cal-close-form"),
                  button("primary", editing ? LOCALE.UPDATE : LOCALE.CREATE, "cal-submit-task"),
                ].filter(Boolean),
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

module.exports.subtaskBody = subtaskBody;