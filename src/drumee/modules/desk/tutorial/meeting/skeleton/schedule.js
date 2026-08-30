/**
 * "Schedule a meeting" — Figma 156:19597, the dialog the Meet flow ends on.
 *
 * Drawn over the weekly calendar the frame shows behind it: a day-header strip
 * and hour rows, enough to read as a week without being a working grid.
 *
 * This is where `tutorial_schedule` went. That step drew the 1.x scheduler as a
 * step of its own inside folder_task; 2.0 puts the scheduler at the end of the
 * MEET flow, which is where someone would actually reach it.
 *
 * Visual only — no services. `sc-dialog` is the spotlight target.
 */

// Sample data: the week the frame shows.
const DAYS = [
  ['07', 'Sunday'], ['08', 'Monday'], ['09', 'Tuesday'], ['10', 'Wednesday'],
  ['11', 'Thursday'], ['12', 'Friday'], ['13', 'Saturday'],
];
const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 AM', '1 PM', '2 PM'];

const field = (p, label, placeholder, extra = {}) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}__sc-field`,
    kids: [
      Skeletons.Note({ active: 0, className: `${p}__sc-label`, content: label }),
      Skeletons.Box.X({ active: 0,
        className: `${p}__sc-entry`,
        dataset: { underline: extra.underline ? 1 : 0 },
        attrOpt: { 'data-underline': extra.underline ? 1 : 0 },
        kids: [
          Skeletons.Note({ active: 0, className: `${p}__sc-entry-text`, content: placeholder }),
          extra.ico
            ? Skeletons.Image.Svg({ active: 0, ico: extra.ico, className: `${p}__sc-entry-ico` })
            : null,
        ].filter(Boolean),
      }),
    ],
  });

/** Hour / minute / AM-PM, twice — start and end. */
const timeGroup = (p, label) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}__sc-field`,
    kids: [
      Skeletons.Note({ active: 0, className: `${p}__sc-label`, content: label }),
      Skeletons.Box.X({ active: 0,
        className: `${p}__sc-time`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}__sc-unit`, content: '00' }),
          Skeletons.Note({ active: 0, className: `${p}__sc-colon`, content: ':' }),
          Skeletons.Note({ active: 0, className: `${p}__sc-unit`, content: '00' }),
          Skeletons.Box.Y({ active: 0,
            className: `${p}__sc-meridiem`,
            kids: [
              Skeletons.Note({ active: 0, className: `${p}__sc-mer`, dataset: { on: 1 }, attrOpt: { 'data-on': 1 }, content: 'AM' }),
              Skeletons.Note({ active: 0, className: `${p}__sc-mer`, content: 'PM' }),
            ],
          }),
        ],
      }),
    ],
  });

module.exports = function (ui) {
  const p = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${p}__sc-stage`,
    kids: [
      // The week behind the dialog.
      Skeletons.Box.Y({ active: 0,
        className: `${p}__sc-week`,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${p}__sc-days`,
            kids: [
              Skeletons.Box.Y({ active: 0, className: `${p}__sc-gutter` }),
              ...DAYS.map(([n, name]) =>
                Skeletons.Box.Y({ active: 0,
                  className: `${p}__sc-day`,
                  kids: [
                    Skeletons.Note({ active: 0, className: `${p}__sc-day-num`, content: n }),
                    Skeletons.Note({ active: 0, className: `${p}__sc-day-name`, content: name }),
                  ],
                }),
              ),
            ],
          }),
          ...HOURS.map((h) =>
            Skeletons.Box.X({ active: 0,
              className: `${p}__sc-row`,
              kids: [
                Skeletons.Note({ active: 0, className: `${p}__sc-hour`, content: h }),
                ...DAYS.map(() => Skeletons.Box.Y({ active: 0, className: `${p}__sc-cell` })),
              ],
            }),
          ),
        ],
      }),

      Skeletons.Box.Y({ active: 0,
        className: `${p}__sc-backdrop`,
        kids: [
          Skeletons.Box.Y({ active: 0,
            className: `${p}__sc-dialog`,
            sys_pn: 'sc-dialog',
            partHandler: ui,
            kids: [
              Skeletons.Box.X({ active: 0,
                className: `${p}__sc-header`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__sc-heading`, content: LOCALE.SCHEDULE_A_MEETING }),
                  Skeletons.Image.Svg({ active: 0, ico: 'cross', className: `${p}__sc-close` }),
                ],
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__sc-cols`,
                kids: [
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__sc-col`,
                    kids: [
                      field(p, LOCALE.TITLE, LOCALE.MEETING_TITLE),
                      field(p, LOCALE.DATE, 'dd/mm/yyyy', { ico: 'sidebar_calendar' }),
                      timeGroup(p, LOCALE.ENTER_TIME),
                    ],
                  }),
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__sc-col`,
                    kids: [
                      field(p, LOCALE.DESCRIPTION_AGENDA, LOCALE.WHATS_THIS_ABOUT),
                      field(p, LOCALE.INVITEES, LOCALE.ADD_FOLDER_MEMBER, { underline: true }),
                      timeGroup(p, LOCALE.END_TIME),
                    ],
                  }),
                ],
              }),
              Skeletons.Note({ active: 0,
                className: `${p}__sc-submit`,
                sys_pn: 'sc-submit',
                partHandler: ui,
                content: LOCALE.SCHEDULE,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
