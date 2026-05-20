
/**
 * 
 * @param {*} ui 
 * @returns 
 */
function control(ui, title, content) {
  return Skeletons.Box.Y({
    kids: [
      Skeletons.Element({
        className: `title text`,
        content: title,
      }),
      Skeletons.Element({
        className: `content text `,
        content,
      }),
    ]
  })
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function header(ui) {
  const fig = `${ui.fig.family}-security__header`;
  return Skeletons.Box.X({
    className: `${fig}-password`,
    kids: [
      Skeletons.Element({
        className: `label text`,
        content: LOCALE.PASSWORD,
      }),
      Skeletons.Element({
        className: `action text `,
        service: "prompt-password",
        content: LOCALE.CHANGE_PASSWORD,
      }),
    ]
  })
}
function menu(ui) {
  const pfx = `${ui.fig.family}-security__menu`;
  let MFA = [LOCALE.OFF, LOCALE.ON];
  let mfa = parseInt(Visitor.profile().mfa) || 0;

  const items = Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}-items`,
    flow: _a.vertical,
    kids: [
      Skeletons.Element({
        content: LOCALE.OFF,
        className: `${pfx}-item`,
        service: 'change-mfa',
        mfa: 0,
        state: 0 ^ mfa
      }),
      Skeletons.Element({
        content: LOCALE.ON,
        className: `${pfx}-item`,
        service: 'change-mfa',
        mfa: 1,
        state: 1 ^ mfa
      }),
    ]
  });

  const trigger = Skeletons.Box.X({
    className: `${pfx}-trigger`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Element({
        className: `${pfx}-username`,
        sys_pn: "current-mfa",
        name: "mfa",
        value: mfa,
        formItem: 1,
        content: MFA[mfa]
      }),
      Skeletons.Button.Svg({ className: `${pfx}-trigger-icon`, ico: "carret-down" }),
    ]
  });

  return Skeletons.Box.X({
    className: `${pfx}-container`,
    debug: __filename,
    kids: [{
      kind: KIND.menu.topic,
      className: `${pfx}-content`,
      flow: _a.y,
      opening: _e.click,
      service: "user-menu",
      sys_pn: "user-dropdown",
      persistence: _a.once,
      trigger,
      items,
      shower: 1,
      offsetY: 20
    }]
  });
};

const { menuInput } = require("../../../../skeleton/toolkit");

/**
 * Auto-lock timeout options (in minutes)
 */
const AUTO_LOCK_OPTIONS = [
  { value: "0", label: LOCALE.NEVER || "Never" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
];

/**
 * Format timeout value for display
 */
function formatTimeoutDisplay(value) {
  const numValue = parseInt(value);
  if (isNaN(numValue)) return LOCALE.NEVER || "Never";
  if (numValue === 0) return LOCALE.NEVER || "Never";
  if (numValue === 60) return "1 hour";
  if (numValue === 120) return "2 hours";
  return `${value} minutes`;
}

/**
 * Create menu input for auto-lock timeout (similar to date format/timezone dropdown)
 */
function autoLockMenu(ui) {
  const settings = Visitor.settings() || {};
  const currentTimeout = settings.auto_lock_timeout || "0";
  
  // Check if current timeout is a custom value (not in predefined options)
  const isCustomValue = !AUTO_LOCK_OPTIONS.some(opt => opt.value === currentTimeout);
  const displayValue = isCustomValue ? formatTimeoutDisplay(currentTimeout) : currentTimeout;
  
  return menuInput(ui, {
    name: 'auto_lock_timeout',
    service: "select-auto-lock-timeout",
    placeholder: '', // Remove placeholder
    value: currentTimeout, // Store actual value, not display value
    items: AUTO_LOCK_OPTIONS,
    className: `${ui.fig.family}-security__auto-lock-input`
  });
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function dangerZoneRow(ui, { title, description, buttonLabel, service, danger }) {
  const pfx = `${ui.fig.family}-security__danger`;
  return Skeletons.Box.X({
    className: `${pfx}-row${danger ? ` ${pfx}-row--danger` : ""}`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}-title`, content: title }),
          Skeletons.Note({ className: `${pfx}-desc`, content: description }),
        ],
      }),
      Skeletons.Element({
        className: `${pfx}-btn${danger ? ` ${pfx}-btn--danger` : ""}`,
        service,
        uiHandler: [ui],
        content: buttonLabel,
      }),
    ],
  });
}

function dangerZone(ui) {
  const pfx = `${ui.fig.family}-security__danger`;
  return Skeletons.Box.Y({
    className: `${pfx}-zone`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-zone-header`,
        kids: [
          Skeletons.Button.Svg({ ico: "apps-warning", className: `${pfx}-zone-icon` }),
          Skeletons.Note({ className: `${pfx}-zone-title`, content: LOCALE.DANGER_ZONE || "Danger zone" }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-zone-body`,
        kids: [
          dangerZoneRow(ui, {
            title: LOCALE.EXPORT_ALL_DATA_TITLE || "Export all my data",
            description: LOCALE.EXPORT_ALL_DATA_DESC || "Download all your files, chat history, and workspace data as a .zip archive.",
            buttonLabel: LOCALE.EXPORT_DATA || "Export data",
            service: "export-data",
            danger: false,
          }),
          dangerZoneRow(ui, {
            title: LOCALE.DELETE_MY_ACCOUNT_TITLE || "Delete my account",
            description: LOCALE.DELETE_MY_ACCOUNT_DESC || "Permanently delete your account and all associated data. This cannot be undone.",
            buttonLabel: LOCALE.DELETE_ACCOUNT || "Delete account",
            service: "delete-account-open",
            danger: true,
          }),
        ],
      }),
    ],
  });
}

function content(ui) {
  const fig = `${ui.fig.family}-security__content`;
  return Skeletons.Box.Y({
    className: `${fig}-controls`,
    kids: [
      Skeletons.Box.G({
        className: `${fig}-control`,
        kids: [
          control(ui, LOCALE.MULTI_FACTOR_AUTH, LOCALE.MFA_TIPS),
          menu(ui),
        ]
      }),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      // Skeletons.Box.G({
      //   className: `${fig}-control`,
      //   kids: [
      //     control(ui, LOCALE.AUTO_LOCK_TITLE || "Auto-lock", LOCALE.AUTO_LOCK_TIPS || "Automatically lock the screen or logout after X minutes of inactivity."),
      //     autoLockMenu(ui),
      //   ]
      // }),
      // Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      Skeletons.Box.G({
        className: `${fig}-control`,
        kids: [
          control(ui, LOCALE.LOGOUT, LOCALE.LOGOUT_TIPS),
          Skeletons.Element({ content: LOCALE.LOGOUT, className: `button text`, on_click: Butler.logout })
        ]
      }),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      dangerZone(ui),
    ]
  })
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function storage(ui) {
  const fig = `${ui.fig.family}-security`;
  return Skeletons.Wrapper.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      header(ui),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      content(ui)
    ]
  });

}

export default storage;
