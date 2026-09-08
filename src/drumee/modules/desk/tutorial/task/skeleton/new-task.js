/**
 * "New task" — Figma 162:20161, the dialog the Task flow ends on.
 *
 * Two columns: the task's own fields on the left, its metadata on the right,
 * with the submit under the metadata. Drawn over an empty Board so the four
 * status columns read behind it, which is what the frame shows.
 *
 * Visual only — no services. `nt-dialog` is the spotlight target.
 */

// The board behind the dialog: four columns, tinted per status, each with its
// count and a "+ New task" slot at the bottom.
// Namespaced keys, not the generic words: IN_PROGRESS already means "Loading"
// in this product, and TO_DO / COMPLETE / LOW … do not exist at all — a missing
// key renders as the key name, which is how "TO_DO" and "Loading" ended up on
// the board.
const COLUMNS = [
  { key: 'todo', label: () => LOCALE.TASK_STATUS_TODO, count: 3 },
  { key: 'progress', label: () => LOCALE.TASK_STATUS_PROGRESS, count: 3 },
  { key: 'review', label: () => LOCALE.TASK_STATUS_REVIEW, count: 3 },
  { key: 'done', label: () => LOCALE.TASK_STATUS_DONE, count: 4 },
];

const STATUSES = COLUMNS.map((c) => c.label);
const PRIORITIES = [
  () => LOCALE.TASK_PRIORITY_LOW, () => LOCALE.TASK_PRIORITY_MEDIUM,
  () => LOCALE.TASK_PRIORITY_HIGH, () => LOCALE.TASK_PRIORITY_URGENT,
];

const field = (p, label, placeholder) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}__nt-field`,
    kids: [
      Skeletons.Note({ active: 0, className: `${p}__nt-label`, content: label }),
      Skeletons.Box.X({ active: 0,
        className: `${p}__nt-entry`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}__nt-entry-text`, content: placeholder }),
        ],
      }),
    ],
  });

const chips = (p, labels) =>
  Skeletons.Box.X({ active: 0,
    className: `${p}__nt-chips`,
    kids: labels.map((t, i) =>
      Skeletons.Note({ active: 0,
        className: `${p}__nt-chip`,
        dataset: { on: i === 0 ? 1 : 0 },
        attrOpt: { 'data-on': i === 0 ? 1 : 0 },
        content: t(),
      }),
    ),
  });

module.exports = function (ui) {
  const p = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${p}__nt-stage`,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}__nt-board`,
        kids: COLUMNS.map((c) =>
          Skeletons.Box.Y({ active: 0,
            className: `${p}__nt-col`,
            dataset: { status: c.key },
            attrOpt: { 'data-status': c.key },
            kids: [
              Skeletons.Box.X({ active: 0,
                className: `${p}__nt-col-head`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__nt-col-name`, content: c.label() }),
                  Skeletons.Note({ active: 0, className: `${p}__nt-col-count`, content: String(c.count) }),
                ],
              }),
              Skeletons.Note({ active: 0, className: `${p}__nt-col-add`, content: `+ ${LOCALE.NEW_TASK}` }),
            ],
          }),
        ),
      }),

      Skeletons.Box.Y({ active: 0,
        className: `${p}__nt-backdrop`,
        kids: [
          Skeletons.Box.Y({ active: 0,
            className: `${p}__nt-dialog`,
            sys_pn: 'nt-dialog',
            partHandler: ui,
            kids: [
              Skeletons.Box.X({ active: 0,
                className: `${p}__nt-header`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__nt-heading`, content: LOCALE.NEW_TASK }),
                  Skeletons.Image.Svg({ active: 0, ico: 'cross', className: `${p}__nt-close` }),
                ],
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__nt-cols`,
                kids: [
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__nt-left`,
                    kids: [
                      field(p, LOCALE.TASK_TITLE, LOCALE.TASK_TITLE),
                      field(p, LOCALE.DESCRIPTION, LOCALE.ADD_MORE_DETAIL),
                      Skeletons.Box.Y({ active: 0,
                        className: `${p}__nt-field`,
                        kids: [
                          Skeletons.Note({ active: 0, className: `${p}__nt-label`, content: LOCALE.CHILD_TASK_ITEMS }),
                          Skeletons.Note({ active: 0, className: `${p}__nt-hint`, content: LOCALE.ADD_CHILD_WORK_ITEM }),
                        ],
                      }),
                      Skeletons.Box.Y({ active: 0,
                        className: `${p}__nt-field`,
                        kids: [
                          Skeletons.Note({ active: 0, className: `${p}__nt-label`, content: LOCALE.FILES }),
                          Skeletons.Box.X({ active: 0,
                            className: `${p}__nt-entry`,
                            kids: [
                              Skeletons.Note({ active: 0, className: `${p}__nt-entry-text`, content: LOCALE.SEARCH_FILE }),
                              Skeletons.Box.X({ active: 0,
                                className: `${p}__nt-upload`,
                                kids: [
                                  Skeletons.Image.Svg({ active: 0, ico: 'desktop_upload', className: `${p}__nt-upload-ico` }),
                                  Skeletons.Note({ active: 0, className: `${p}__nt-upload-label`, content: LOCALE.UPLOAD }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),

                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__nt-right`,
                    kids: [
                      Skeletons.Box.Y({ active: 0,
                        className: `${p}__nt-field`,
                        kids: [
                          Skeletons.Note({ active: 0, className: `${p}__nt-label`, content: LOCALE.STATUS }),
                          chips(p, STATUSES),
                        ],
                      }),
                      Skeletons.Box.Y({ active: 0,
                        className: `${p}__nt-field`,
                        kids: [
                          Skeletons.Note({ active: 0, className: `${p}__nt-label`, content: LOCALE.PRIORITY }),
                          chips(p, PRIORITIES),
                        ],
                      }),
                      field(p, LOCALE.ASSIGNEE, LOCALE.SEARCH_FOR_PEOPLE),
                      field(p, LOCALE.DUE_DATE, 'dd/mm/yyyy'),
                      Skeletons.Note({ active: 0,
                        className: `${p}__nt-submit`,
                        sys_pn: 'nt-submit',
                        partHandler: ui,
                        content: LOCALE.ADD_NEW_TASK,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
