/**
 * The "Folder Secure Share" panel — Step 5's subject.
 *
 * Figma 3314:86712 / 3314:86722 / 3314:140345, which are real vector frames, so
 * the metrics here are the design's own: 450px panel, 24px gutters, 401px
 * blocks, 55px option rows, a 36px primary button, and the 4-segment expiry
 * control. Tokens: Primary/40 #5950ff, Signal/Error #d74e49, Grey/80 #65656c.
 *
 * One builder renders all three screens; `opt` says how far the user has got:
 *   {}                        → recipient mode, both access modes collapsed
 *   {secure: true}            → Secure Share picked, its controls expanded
 *   {secure: true, link: true} → plus the generated link and Revoke
 *
 * Visual only — no services. Spotlight targets: `recipient`, `secure`, `link`.
 */

const PERMISSIONS = [
  { key: 'download', ico: 'download', label: 'Can Download', on: true },
  { key: 'chat', ico: 'apps-chat', label: 'Can Chat' },
  { key: 'edit', ico: 'ctxmenu-rename', label: 'Can Edit' },
];

const EXPIRY = ['1h', '24h', '7d', '13d'];

const VISITS = [1, 2, 3, 4, 5].map(() => ({
  email: 'julian.v@drumee.io',
  when: 'Jun 12, 10:23 AM',
  duration: '2h 10m',
}));

const sectionLabel = (pfx, text) =>
  Skeletons.Note({ className: `${pfx}__label`, content: text });

const check = (pfx, on) =>
  Skeletons.Box.Y({
    className: `${pfx}__check${on ? ' on' : ''}`,
    kids: on ? [Skeletons.Image.Svg({ ico: 'desktop_check', className: `${pfx}__check-icon` })] : [],
  });

const radio = (pfx, on) =>
  Skeletons.Box.Y({ className: `${pfx}__radio${on ? ' on' : ''}` });

const toggle = (pfx, on = true) =>
  Skeletons.Box.Y({
    className: `${pfx}__toggle${on ? ' on' : ''}`,
    kids: [Skeletons.Box.Y({ className: `${pfx}__toggle-knob` })],
  });

// ── Recipient mode ────────────────────────────────────────────────────────────
function recipient(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__block`,
    // Screen 1's spotlight target — the design's connector lands here.
    sys_pn: 'recipient',
    partHandler: ui,
    kids: [
      sectionLabel(pfx, LOCALE.RECIPIENT_MODE || 'Recipient mode'),
      Skeletons.Note({
        className: `${pfx}__hint`,
        content: LOCALE.RECIPIENT_MODE_HINT
          || 'Users can view by default. Select additional permissions below.',
      }),
      Skeletons.Box.Y({
        className: `${pfx}__rows`,
        kids: PERMISSIONS.map((p) =>
          Skeletons.Box.X({
            className: `${pfx}__row${p.on ? ' selected' : ''}`,
            kids: [
              Skeletons.Image.Svg({ ico: p.ico, className: `${pfx}__row-icon` }),
              Skeletons.Note({ className: `${pfx}__row-label`, content: p.label }),
              check(pfx, p.on),
            ],
          }),
        ),
      }),
    ],
  });
}

// ── Access management ─────────────────────────────────────────────────────────
function chip(pfx, text) {
  return Skeletons.Box.X({
    className: `${pfx}__chip`,
    kids: [
      Skeletons.Note({ className: `${pfx}__chip-label`, content: text }),
      Skeletons.Image.Svg({ ico: 'cross', className: `${pfx}__chip-x` }),
    ],
  });
}

/** An option row: icon, label over hint, and its control on the right. */
function option(pfx, ico, label, hint, control) {
  return Skeletons.Box.X({
    className: `${pfx}__opt`,
    kids: [
      ico ? Skeletons.Image.Svg({ ico, className: `${pfx}__opt-icon` }) : null,
      Skeletons.Box.Y({
        className: `${pfx}__opt-body`,
        kids: [
          Skeletons.Note({ className: `${pfx}__opt-label`, content: label }),
          hint ? Skeletons.Note({ className: `${pfx}__opt-hint`, content: hint }) : null,
        ].filter(Boolean),
      }),
      control,
    ].filter(Boolean),
  });
}

/**
 * The controls that appear once Secure Share is the chosen mode.
 *
 * The design groups them into two white cards inside the purple-bordered
 * block — who may open the link, then how it is locked — rather than one flat
 * stack of rows.
 */
function secureControls(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__secure-body`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__group`,
        kids: [
          option(
            pfx,
            'account_mail',
            LOCALE.REQUIRE_EMAIL_TO_VIEW || 'Require email to view',
            LOCALE.VIEWER_MUST_ENTER_EMAIL || 'Viewer must enter their email',
            check(pfx, true),
          ),
          Skeletons.Box.X({
            className: `${pfx}__opt`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__opt-label grow`,
                content: LOCALE.RESTRICT_ACCESS_EMAILS
                  || 'Restrict access to specific emails or domains',
              }),
              Skeletons.Image.Svg({ ico: 'ctxmenu-info', className: `${pfx}__opt-info` }),
              toggle(pfx, true),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__chips`,
            kids: [
              chip(pfx, 'member@drumee.com'),
              chip(pfx, 'member@drumee.com'),
              Skeletons.Note({ className: `${pfx}__chip more`, content: '+3' }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__field`,
            content: LOCALE.ENTER_EMAIL_OR_DOMAIN || 'Enter email or domain and press Enter…',
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__group`,
        kids: [
          option(
            pfx,
            'lock',
            LOCALE.ADD_PASSWORD_PROTECTION || 'Add password protection',
            LOCALE.SET_PASSWORD_FOR_ACCESS || 'Set a password for access',
            check(pfx, true),
          ),
          Skeletons.Box.X({
            className: `${pfx}__field pw`,
            kids: [
              Skeletons.Note({ className: `${pfx}__field-value`, content: '123456' }),
              Skeletons.Image.Svg({ ico: 'ctxmenu-rename', className: `${pfx}__field-icon edit` }),
            ],
          }),
        ],
      }),
    ],
  });
}

function accessManagement(ui, pfx, secure) {
  const mode = (ico, label, hint, on, kids = []) =>
    Skeletons.Box.Y({
      className: `${pfx}__mode${on ? ' selected' : ''}`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__mode-head`,
          kids: [
            Skeletons.Image.Svg({ ico, className: `${pfx}__row-icon` }),
            Skeletons.Box.Y({
              className: `${pfx}__opt-body`,
              kids: [
                Skeletons.Note({ className: `${pfx}__opt-label`, content: label }),
                Skeletons.Note({ className: `${pfx}__opt-hint`, content: hint }),
              ],
            }),
            radio(pfx, on),
          ],
        }),
        ...kids,
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__block`,
    kids: [
      sectionLabel(pfx, LOCALE.ACCESS_MANAGEMENT || 'Access Management'),
      Skeletons.Box.Y({
        className: `${pfx}__rows`,
        kids: [
          mode(
            'apps-globe',
            LOCALE.PUBLIC_SHARE || 'Public Share',
            LOCALE.ANYONE_WITH_LINK_CAN_VIEW || 'Anyone with the link can view',
            false,
          ),
          // Screen 2's spotlight target: the mode plus everything it unfolds.
          Skeletons.Box.Y({
            className: `${pfx}__mode-wrap`,
            sys_pn: 'secure',
            partHandler: ui,
            kids: [
              mode(
                'shield',
                LOCALE.SECURE_SHARE || 'Secure Share',
                LOCALE.PROTECT_SHARED_CONTENT || 'Protect shared content with access controls',
                secure,
                secure ? [secureControls(pfx)] : [],
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Expiry + link ─────────────────────────────────────────────────────────────
function expiry(ui, pfx, link) {
  return Skeletons.Box.Y({
    className: `${pfx}__block`,
    // Screen 3's spotlight target: expiry, the button and the issued link.
    sys_pn: 'link',
    partHandler: ui,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__label-row`,
        kids: [
          sectionLabel(pfx, LOCALE.LINK_EXPIRATION || 'Link Expiration'),
          toggle(pfx, true),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__segments`,
        kids: EXPIRY.map((e, i) =>
          Skeletons.Box.X({
            className: `${pfx}__segment${i === EXPIRY.length - 1 ? ' selected' : ''}`,
            kids: [
              Skeletons.Note({ className: `${pfx}__segment-label`, content: e }),
              i === EXPIRY.length - 1
                ? Skeletons.Image.Svg({ ico: 'calendar', className: `${pfx}__segment-icon` })
                : null,
            ].filter(Boolean),
          }),
        ),
      }),
      Skeletons.Box.X({
        className: `${pfx}__cta`,
        kids: [
          Skeletons.Image.Svg({ ico: 'apps-link-simple', className: `${pfx}__cta-icon` }),
          Skeletons.Note({
            className: `${pfx}__cta-label`,
            content: LOCALE.GET_LINK || 'Get link',
          }),
        ],
      }),
      link
        ? Skeletons.Box.X({
          className: `${pfx}__link-row`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__field link`,
              kids: [
                Skeletons.Image.Svg({ ico: 'editbox_link', className: `${pfx}__field-icon` }),
                Skeletons.Note({
                  className: `${pfx}__field-value`,
                  content: 'drumee.com/s/new-link…',
                }),
                Skeletons.Image.Svg({ ico: 'ctxmenu-copy', className: `${pfx}__field-icon` }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}__revoke`,
              kids: [
                Skeletons.Image.Svg({ ico: 'app-ban', className: `${pfx}__revoke-icon` }),
                Skeletons.Note({
                  className: `${pfx}__revoke-label`,
                  content: LOCALE.REVOKE || 'Revoke',
                }),
              ],
            }),
          ],
        })
        : null,
    ].filter(Boolean),
  });
}

// ── Access log ────────────────────────────────────────────────────────────────
function accessLog(pfx) {
  const cell = (text, col) =>
    Skeletons.Note({ className: `${pfx}__cell`, dataset: { col }, content: text });

  return Skeletons.Box.Y({
    className: `${pfx}__block`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__label-row`,
        kids: [
          sectionLabel(pfx, LOCALE.NOTIFY_WHEN_SOMEONE_OPENS || 'Notify when someone opens'),
          toggle(pfx, true),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__log`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__log-row head`,
            kids: [
              cell(LOCALE.EMAIL || 'Email', 'email'),
              cell(LOCALE.ACCESS_TIME || 'Access Time', 'when'),
              cell(LOCALE.DURATION || 'Duration', 'duration'),
              cell(LOCALE.ACTION || 'Action', 'action'),
            ],
          }),
          ...VISITS.map((v) =>
            Skeletons.Box.X({
              className: `${pfx}__log-row`,
              kids: [
                Skeletons.Box.X({
                  className: `${pfx}__cell`,
                  dataset: { col: 'email' },
                  kids: [
                    Skeletons.Box.Y({ className: `${pfx}__log-avatar` }),
                    Skeletons.Note({ className: `${pfx}__log-email`, content: v.email }),
                  ],
                }),
                cell(v.when, 'when'),
                cell(v.duration, 'duration'),
                Skeletons.Box.Y({
                  className: `${pfx}__cell`,
                  dataset: { col: 'action' },
                  kids: [
                    Skeletons.Box.Y({
                      className: `${pfx}__log-remove`,
                      kids: [
                        Skeletons.Image.Svg({ ico: 'cross', className: `${pfx}__log-remove-icon` }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @param {String} pfx
 * @param {Object} [opt]
 * @param {Boolean} [opt.secure] Secure Share is the chosen mode
 * @param {Boolean} [opt.link] a link has been issued
 */
module.exports = function panel(ui, pfx, opt = {}) {
  const { secure = false, link = false } = opt;
  return Skeletons.Box.Y({
    className: `${pfx}__panel`,
    // Which part of the panel the screen is looking at. The panel is taller
    // than the window — as it is in the design, where it scrolls — and the
    // widget scrolls the block into view at render time (_scrollPanelTo).
    // Kept as a hook for styling and for reading the rendered state.
    dataset: { view: link ? 'link' : secure ? 'secure' : 'mode' },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__panel-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__panel-title`,
            content: LOCALE.FOLDER_SECURE_SHARE || 'Folder Secure Share',
          }),
          Skeletons.Image.Svg({ ico: 'cross', className: `${pfx}__panel-close` }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__panel-body`,
        kids: [
          recipient(ui, pfx),
          accessManagement(ui, pfx, secure),
          expiry(ui, pfx, link),
          accessLog(pfx),
        ],
      }),
    ],
  });
};
