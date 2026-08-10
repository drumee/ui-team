const { entry, button } = require("../../../../skeleton/toolkit");

function header(ui) {
  const pfx = `${ui.fig.family}__header`;
  return Skeletons.Box.X({
    className: `${pfx}-row`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-title`,
            content: LOCALE.ACCOUNT_SETTINGS || "Account settings",
          }),
          Skeletons.Note({
            className: `${pfx}-subtitle`,
            content:
              LOCALE.ACCOUNT_SETTINGS_SUBTITLE ||
              "Manage your account preferences, notifications, and connected apps.",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}-actions`,
        kids: [
          // Save confirmation pill. Hidden while data-state="0"; saveProfile()
          // flips it to "1" (success) / "1" + data-variant="error" (failure)
          // and a timer fades it back out — see _flashSaveStatus().
          Skeletons.Note({
            className: `${pfx}-saved`,
            sys_pn: "save-status",
            state: 0,
            content: LOCALE.PROFILE_SAVED || "Profile saved",
          }),
          button(ui, {
            label: LOCALE.SAVE_PROFILE || "Save Profile",
            className: `${pfx}-save`,
            priority: "primary",
            service: "save-profile",
          }),
        ],
      }),
    ],
  });
}

function cardHeading(ui, { title, subtitle }) {
  const pfx = `${ui.fig.family}__card`;
  return Skeletons.Box.Y({
    className: `${pfx}-heading`,
    kids: [
      Skeletons.Note({ className: `${pfx}-title`, content: title }),
      subtitle
        ? Skeletons.Note({ className: `${pfx}-subtitle`, content: subtitle })
        : null,
    ].filter(Boolean),
  });
}

function generalProfileCard(ui) {
  const pfx = `${ui.fig.family}__profile`;
  const profile = Visitor.profile() || {};
  // Visitor.avatar() builds <endpoint>/avatar/<id>?ts=<mtime>; bumping
  // Visitor.mtime in _refreshAvatar() busts the browser cache.
  const avatar = Visitor.id ? Visitor.avatar() : "default";
  const fullname = Visitor.fullname() || "";

  const avatarBlock = Skeletons.Box.Y({
    className: `${pfx}-avatar-block`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-avatar-frame`,
        sys_pn: "avatar-frame",
        service: "edit-avatar",
        uiHandler: [ui],
        // data-processing="1" dims/blurs the avatar and shows the spinner
        // overlay while HEIC conversion + upload are in flight. Driven by
        // an instance flag so the state survives skeleton re-renders.
        dataset: { processing: ui.isAvatarProcessing && ui.isAvatarProcessing() ? 1 : 0 },
        kids: [
          Skeletons.Avatar(avatar, `${pfx}-avatar`, fullname),
          Skeletons.Button.Svg({
            ico: "editbox_pencil",
            className: `${pfx}-avatar-edit`,
            service: "edit-avatar",
            uiHandler: [ui],
          }),
          // Processing overlay — hidden via CSS unless the frame carries
          // data-processing="1". active:0 keeps the frame's edit-avatar
          // click intact (see feedback_skeleton_event_active).
          Skeletons.Box.Z({
            className: `${pfx}-avatar-overlay`,
            active: 0,
            kids: [
              Skeletons.Note({ className: `${pfx}-avatar-spinner`, active: 0 }),
            ],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}-avatar-label`,
        content: LOCALE.EDIT_AVATAR || "EDIT AVATAR",
      }),
      // Skeletons.FileSelector hardcodes sys_pn:"fileselector" — match
      // it via ensurePart("fileselector") in openAvatarPicker().
      Skeletons.FileSelector({
        // Explicit .heic/.heif on top of image/* — some desktop browsers
        // grey out HEIC under a bare image/* filter (missing MIME
        // registration), which would block selection before _convertHeic
        // ever runs. iPhone photos are HEIC by default.
        accept: "image/*,.heic,.heif",
        className: `${pfx}-avatar-input`,
      }),
    ],
  });

  const fields = Skeletons.Box.Y({
    className: `${pfx}-fields`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-fields-row`,
        kids: [
          entry(ui, {
            label: LOCALE.DISPLAY_NAME || "Display Name",
            name: "display_name",
            value: profile.firstname || "",
          }),
          entry(ui, {
            label: LOCALE.USERNAME || "Username",
            name: "username",
            value: profile.username || "",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-bio`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-bio-label`,
            content: LOCALE.BIO || "Bio",
          }),
          Skeletons.Textarea({
            className: `${pfx}-bio-input`,
            name: "bio",
            formItem: "bio",
            value: profile.bio || "",
            placeholder: LOCALE.BIO_PLACEHOLDER,
            rows: 3,
            mode: _a.commit,
            ignoreEnter: true,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, {
        title: LOCALE.GENERAL_PROFILE || "General Profile",
        subtitle:
          LOCALE.GENERAL_PROFILE_SUBTITLE ||
          "Manage your public identity and profile visuals.",
      }),
      Skeletons.Box.X({
        className: `${pfx}-body`,
        kids: [avatarBlock, fields],
      }),
    ],
  });
}

function innerItem(ui, opt) {
  const pfx = `${ui.fig.family}__inner`;
  const {
    ico,
    title,
    description,
    trailing,
    className = "",
    descriptionPn,
  } = opt;
  const left = Skeletons.Box.X({
    className: `${pfx}-left`,
    kids: [
      ico ? Skeletons.Button.Svg({ ico, className: `${pfx}-ico` }) : null,
      Skeletons.Box.Y({
        className: `${pfx}-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}-title`, content: title }),
          description
            ? Skeletons.Note({
                className: `${pfx}-description`,
                content: description,
                sys_pn: descriptionPn,
              })
            : null,
        ].filter(Boolean),
      }),
    ].filter(Boolean),
  });

  return Skeletons.Box.X({
    className: `${pfx} ${className}`,
    kids: [left, trailing].filter(Boolean),
  });
}

function toggle(ui, opt) {
  const pfx = `${ui.fig.family}__toggle`;
  const { service, sys_pn, state = 0 } = opt;
  // Use `toggle:1` (per-widget toggle), NOT `radiotoggle:1`. The latter
  // wires every toggle with the same channel ID (= the value passed to
  // radiotoggle) into the same RADIO_BROADCAST channel, so clicking the
  // Email-notifications switch was broadcasting to channel `1` and the
  // 2FA switch (also on channel `1`) reset its own state to 0 in
  // response. `toggle:1` toggles state independently per widget.
  return Skeletons.Box.X({
    className: pfx,
    sys_pn,
    state,
    toggle: 1,
    service,
    uiHandler: [ui],
    kids: [Skeletons.Box.X({ className: `${pfx}-knob` })],
  });
}

// Display-mode selector. Dark mode is disabled product-wide (see
// router/theme.js DARK_MODE_ENABLED) — only the Light option is offered, so
// there is no path to switch into dark/system. Restore the Dark/System
// options here together with the theme.js flag to re-enable dark mode.
// getThemePreference is light-locked while disabled, so Light is always
// active. Selecting it fires "set-theme"; settings_main applies it via the
// shared router/theme helper and updates the highlight in place.
function themeControl(ui) {
  const pfx = `${ui.fig.family}__theme`;
  const current = require("router/theme").getThemePreference();

  const opt = (mode, ico, label) =>
    Skeletons.Box.X({
      className: `${pfx}-opt`,
      sys_pn: `theme-opt-${mode}`,
      service: "set-theme",
      theme_mode: mode,
      uiHandler: [ui],
      dataset: { mode, active: current === mode ? 1 : 0 },
      kids: [
        Skeletons.Button.Svg({ ico, className: `${pfx}-opt-ico`, active: 0 }),
        Skeletons.Note({
          className: `${pfx}-opt-label`,
          content: label,
          active: 0,
        }),
      ],
    });

  return Skeletons.Box.X({
    className: `${pfx}-control`,
    kids: [
      opt("light", "raw-light", LOCALE.LIGHT || "Light"),
    ],
  });
}

function preferencesCard(ui) {
  const pfx = `${ui.fig.family}__preferences`;
  const settings = Visitor.settings() || {};
  const emailOn = settings.email_notifications ? 1 : 0;
  const mfaOn = parseInt(Visitor.profile().mfa) ? 1 : 0;

  // Appearance (display mode) — moved here from the sidebar. Stacked layout
  // so the segmented control sits below the title/description on its own row.
  const appearanceRow = innerItem(ui, {
    title: LOCALE.DISPLAY_MODE || "Display mode",
    description:
      LOCALE.DISPLAY_MODE_DESC ||
      "Choose how Drumee looks. System follows your device setting.",
    className: `${pfx}-appearance-row`,
    trailing: themeControl(ui),
  });

  const emailRow = innerItem(ui, {
    title: LOCALE.EMAIL_NOTIFICATIONS || "Email notifications",
    description:
      LOCALE.EMAIL_NOTIFICATIONS_DESC ||
      "Get notified about activity in your workspaces",
    trailing: toggle(ui, {
      sys_pn: "toggle-email",
      service: "toggle-email-notifications",
      state: emailOn,
    }),
  });

  const mfaRow = innerItem(ui, {
    title: LOCALE.TWO_FACTOR_AUTH || "Two-factor authentication",
    description:
      LOCALE.TWO_FACTOR_AUTH_DESC ||
      "Add an extra layer of security to your account",
    trailing: toggle(ui, {
      sys_pn: "toggle-mfa",
      service: "toggle-two-factor",
      state: mfaOn,
    }),
  });

  // Connected apps placeholder. The full feature (Drumee as an OAuth
  // provider — third-party apps consuming Drumee accounts) isn't built
  // yet; this row reserves the surface and shows users it's coming.
  const appsRow = innerItem(ui, {
    title: LOCALE.CONNECTED_APPS || "Connected apps",
    description: LOCALE.CONNECTED_APPS_DESC || "Manage third-party app access",
    trailing: Skeletons.Note({
      className: `${pfx}-coming-soon`,
      content: LOCALE.COMING_SOON,
    }),
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, { title: LOCALE.PREFERENCES || "Preferences" }),
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        kids: [appearanceRow, emailRow, mfaRow, appsRow],
      }),
    ],
  });
}

function accountCredentialsCard(ui) {
  const pfx = `${ui.fig.family}__credentials`;
  const profile = Visitor.profile() || {};

  const emailRow = innerItem(ui, {
    ico: "mail",
    title: LOCALE.EMAIL_ADDRESS || "Email Address",
    description: profile.email || "",
    descriptionPn: "credentials-email",
    className: `${pfx}-row email-row`,
    trailing: button(ui, {
      label: LOCALE.CHANGE || "Change",
      className: `${pfx}-action`,
      priority: "ghost",
      service: "change-email",
    }),
  });

  // Always offered — even for accounts inferred as OAuth-only
  // (password_set=0): such users may in fact hold a password (linking
  // Google later does not remove it), and hiding the row made password
  // management unreachable for them. A genuinely passwordless account
  // simply fails the current-password check inside the modal.
  const passwordRow = innerItem(ui, {
    ico: "account_padlock",
    title: LOCALE.PASSWORD || "Password",
    description: "•••••••••••••••",
    className: `${pfx}-row`,
    trailing: button(ui, {
      label: LOCALE.CHANGE || "Change",
      className: `${pfx}-action`,
      priority: "ghost",
      service: "edit-password",
    }),
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, {
        title: LOCALE.ACCOUNT_CREDENTIALS || "Account Credentials",
        subtitle:
          LOCALE.ACCOUNT_CREDENTIALS_SUBTITLE ||
          "Sensitive settings to secure your curator environment.",
      }),
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        kids: [emailRow, passwordRow].filter(Boolean),
      }),
    ],
  });
}

function dangerZoneCard(ui) {
  const pfx = `${ui.fig.family}__danger`;

  const exportRow = innerItem(ui, {
    title: LOCALE.EXPORT_ALL_MY_DATA || "Export all my data",
    description:
      LOCALE.EXPORT_DATA_DESC ||
      "Download all your files, chat history, and workspace data as a .zip archive.",
    className: `${pfx}-row`,
    trailing: button(ui, {
      label: LOCALE.EXPORT_DATA || "Export data",
      ico: "download",
      icoPosition: "left",
      className: `${pfx}-export-btn`,
      priority: "ghost",
      service: "export-data",
    }),
  });

  const deleteRow = innerItem(ui, {
    title: LOCALE.DELETE_MY_ACCOUNT || "Delete my account",
    description:
      LOCALE.DELETE_ACCOUNT_DESC ||
      "Permanently delete your account and all associated data. This cannot be undone.",
    className: `${pfx}-row ${pfx}-row-delete`,
    trailing: button(ui, {
      label: LOCALE.DELETE_ACCOUNT || "Delete account",
      className: `${pfx}-delete-btn`,
      priority: "danger",
      service: "delete-account",
    }),
  });

  const headerRow = Skeletons.Box.X({
    className: `${pfx}-header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-warning`,
        kids: [
          Skeletons.Button.Svg({
            ico: "apps-warning",
            className: `${pfx}-warning-ico`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${ui.fig.family}__card-title`,
        content: LOCALE.DANGER_ZONE || "Danger zone",
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      headerRow,
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        kids: [exportRow, deleteRow],
      }),
    ],
  });
}

function linkedAccountsCard(ui) {
  const pfx = `${ui.fig.family}__linked`;

  // Migrate-from-Google-Drive CTA. Reflects the gdrive state fetched on load
  // (google_drive.get_state): a running job shows live progress + %, a prior
  // job offers "Migrate again", otherwise "Start". The button always opens the
  // popup (full, live progress); the row is just a load-time snapshot.
  const gd = (ui.getGdriveState && ui.getGdriveState()) || {};
  const gjob = gd.job;
  const gRunning = !!(gjob && (gjob.status === "queued" || gjob.status === "running"));
  const gPct = (gRunning && gjob.total_files > 0)
    ? Math.min(100, Math.round((gjob.processed_files || 0) / gjob.total_files * 100))
    : 0;
  const migrateDesc = gRunning
    ? `${LOCALE.MIGRATION_IN_PROGRESS || "Migration in progress"} — ${gjob.processed_files || 0}/${gjob.total_files || "?"} (${gPct}%)`
    : (LOCALE.MIGRATE_GDRIVE_HINT || "Imports files and folders from your Google Drive into Drumee.");
  const migrateLabel = gRunning
    ? (LOCALE.MIGRATE_GDRIVE_VIEW || "View progress")
    : (gjob ? (LOCALE.MIGRATE_GDRIVE_AGAIN || "Migrate again") : (LOCALE.MIGRATE_GDRIVE_START || "Start"));

  const migrateRow = innerItem(ui, {
    ico: "logo-google",
    title: LOCALE.LINKED_ACCOUNTS_MIGRATE_GDRIVE || "Migrate from Google Drive",
    description: migrateDesc,
    className: `${pfx}-row ${pfx}-row--migrate`,
    trailing: button(ui, {
      label: migrateLabel,
      className: `${pfx}-migrate-btn`,
      priority: "primary",
      service: "launch-gdrive-migration",
    }),
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, {
        // Re-framed from "connected accounts / sign-in providers" to an
        // import/migration heading: this card only hosts the Google Drive
        // migration CTA, not linked sign-in accounts.
        title: LOCALE.IMPORT_SECTION_TITLE,
        subtitle: LOCALE.IMPORT_SECTION_SUBTITLE,
      }),
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        kids: [migrateRow],
      }),
    ],
  });
}

function billingCard(ui) {
  const pfx = `${ui.fig.family}__billing`;
  // Resolved through libs/billing, not capitalised from quota.plan — that
  // field still carries retired ('pro') and hand-granted ('Drumee Plus')
  // names, which would name a plan that no longer exists.
  const planLabel = require("libs/billing").planLabel();

  // Title row: "Current Plan" + "Manage subscription" (Figma 2769-213367,
  // "Frame 1618872890"). The plan name is a SEPARATE block below it, paired
  // tightly with the status line — not this row's description — so the
  // 24px row-to-row gap lands between the title row and the Pro/status
  // pair, not between "Pro" and its own status line.
  const planRow = innerItem(ui, {
    title: LOCALE.CURRENT_PLAN,
    className: `${pfx}-row`,
    trailing: button(ui, {
      label: LOCALE.MANAGE_SUBSCRIPTION,
      className: `${pfx}-action`,
      priority: "primary",
      // Opens settings_billing in the desk modal (wm 'upgrade-plan' -> upgradePlage).
      service: "open-billing",
    }),
  });

  const planNameLine = Skeletons.Note({
    className: `${pfx}-plan-name`,
    sys_pn: "billing-plan-name",
    content: planLabel,
  });

  // Subscription status line ("renews on … " / "will be canceled on …"),
  // fed asynchronously by _loadSubscriptionStatus() via the named part —
  // the design's "Your subscription will be canceled on Feb 27, 2026".
  const statusLine = Skeletons.Note({
    className: `${pfx}-status`,
    sys_pn: "billing-sub-status",
    partHandler: ui,
    content: "",
  });

  const planBlock = Skeletons.Box.Y({
    className: `${pfx}-plan-block`,
    kids: [planNameLine, statusLine],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, {
        title: LOCALE.BILLING_SUBSCRIPTION,
        subtitle: LOCALE.BILLING_SUBSCRIPTION_SUBTITLE,
      }),
      Skeletons.Box.Y({ className: `${pfx}-list`, kids: [planRow, planBlock] }),
    ],
  });
}

function referralCard(ui) {
  const pfx = `${ui.fig.family}__referral`;
  const r = (ui.getReferral && ui.getReferral()) || {};
  const code = r.referral_code;
  const url = r.referral_url;

  const copyBtn = (service) =>
    button(ui, { label: LOCALE.COPY || "Copy", className: `${pfx}-action`, priority: "secondary", service });

  const rows = code
    ? [
        innerItem(ui, {
          title: LOCALE.REFERRAL_CODE || "Referral code",
          description: code,
          className: `${pfx}-row`,
          trailing: copyBtn("copy-referral-code"),
        }),
        innerItem(ui, {
          title: LOCALE.REFERRAL_LINK || "Referral link",
          description: url,
          className: `${pfx}-row`,
          trailing: url ? copyBtn("copy-referral-link") : null,
        }),
      ]
    : [
        innerItem(ui, {
          title: LOCALE.REFERRAL || "Referral",
          description: LOCALE.REFERRAL_UNAVAILABLE || "Not available yet",
          className: `${pfx}-row`,
        }),
      ];

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, {
        title: LOCALE.REFERRAL_TITLE || "Invite members",
        subtitle: LOCALE.REFERRAL_SUBTITLE || "Share your link",
      }),
      Skeletons.Box.Y({ className: `${pfx}-list`, kids: rows }),
    ],
  });
}

function settings_body(ui) {
  const pfx = ui.fig.family;
  return [
    header(ui),
    Skeletons.Box.X({
      className: `${pfx}__row ${pfx}__row-1`,
      kids: [generalProfileCard(ui), preferencesCard(ui)],
    }),
    // Figma 2769-277671: Billing, Account Credentials and Danger zone sit in
    // ONE 3-column row. Referral/invite isn't part of that frame — kept as
    // its own full-width row instead of crowding the trio.
    Skeletons.Box.X({
      className: `${pfx}__row ${pfx}__row-2`,
      kids: [billingCard(ui), accountCredentialsCard(ui), dangerZoneCard(ui)],
    }),
    Skeletons.Box.X({
      className: `${pfx}__row ${pfx}__row-referral`,
      kids: [referralCard(ui)],
    }),
    Skeletons.Box.X({
      className: `${pfx}__row ${pfx}__row-3`,
      kids: [linkedAccountsCard(ui)],
    }),
    Skeletons.Wrapper.Y({
      className: `${pfx}__overlay`,
      sys_pn: "overlay",
    }),
    // Transient top-right toast slot (empty until _showToast feeds it). Used
    // to confirm the 2FA enable/disable outcome once the OTP modal closes.
    Skeletons.Box.Y({
      className: `${pfx}__toast-slot`,
      sys_pn: "settings-toast",
    }),
  ].filter(Boolean);
}

export default settings_body;
