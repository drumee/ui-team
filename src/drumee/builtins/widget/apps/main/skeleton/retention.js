function backLink(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__retpolicy-back`,
    service: "apps-back-storage",
    uiHandler: [ui],
    kids: [
      Skeletons.Image.Svg({ ico: "apps-back", className: `${pfx}__retpolicy-back-ico` }),
      Skeletons.Note({
        className: `${pfx}__retpolicy-back-label`,
        content: LOCALE.BACK_TO_STORAGE_CONSOLE || "Back to Storage Console",
      }),
    ],
  });
}

function windowHeader(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__retpolicy-window-header`,
    kids: [
      Skeletons.Image.Svg({ ico: "apps-lock-shield", className: `${pfx}__retpolicy-lock-purple` }),
      Skeletons.Note({
        className: `${pfx}__retpolicy-window-title`,
        content: LOCALE.VERSIONING_RETENTION_POLICY || "Versioning Retention Policy",
      }),
    ],
  });
}

function infoCardStorageModel(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__retpolicy-info ${pfx}__retpolicy-info--storage`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__retpolicy-info-top`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__retpolicy-info-iconwrap`,
            kids: [
              Skeletons.Image.Svg({ ico: "apps-database", className: `${pfx}__retpolicy-info-ico ${pfx}__retpolicy-info-ico--db` }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__retpolicy-info-meta`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-label`,
                content: LOCALE.STORAGE_MODEL || "STORAGE MODEL",
              }),
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-value`,
                content: LOCALE.FULL_FILE_COPY || "Full File Copy",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__retpolicy-info-body`,
        content:
          LOCALE.STORAGE_MODEL_BODY ||
          "Every version is stored as a discrete object. This ensures maximum data integrity but consumes storage proportionally to file size.",
      }),
    ],
  });
}

function infoCardReadOnly(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__retpolicy-info ${pfx}__retpolicy-info--readonly`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__retpolicy-info-top`,
        kids: [
          Skeletons.Image.Svg({ ico: "apps-lock-padlock", className: `${pfx}__retpolicy-info-ico ${pfx}__retpolicy-info-ico--lock-red` }),
          Skeletons.Note({
            className: `${pfx}__retpolicy-info-title-red`,
            content: LOCALE.READONLY_ACCESS || "ReadOnly Access",
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__retpolicy-info-body ${pfx}__retpolicy-info-body--red`,
        content:
          LOCALE.READONLY_ACCESS_BODY ||
          "Global hub settings are managed by the Root Administrator. Workspace Admins can view but not alter these parameters.",
      }),
    ],
  });
}

function infoCardImpact(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__retpolicy-info ${pfx}__retpolicy-info--impact`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__retpolicy-info-impact-title`,
        content: LOCALE.VERSIONING_IMPACT || "VERSIONING IMPACT",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__retpolicy-info-impact-list`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__retpolicy-info-impact-row`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-impact-key`,
                content: LOCALE.CURRENT_FILES || "Current Files",
              }),
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-impact-val`,
                content: "1.2 TB",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__retpolicy-info-impact-row`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-impact-key`,
                content: LOCALE.VERSION_HISTORY || "Version History",
              }),
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-impact-val ${pfx}__retpolicy-info-impact-val--accent`,
                content: "+450 GB",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__retpolicy-info-impact-row ${pfx}__retpolicy-info-impact-row--total`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-impact-key`,
                content: LOCALE.TOTAL_HUB_USAGE || "Total Hub Usage",
              }),
              Skeletons.Note({
                className: `${pfx}__retpolicy-info-impact-val`,
                content: "1.65 TB",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function periodChoice(ui, days) {
  const pfx = ui.fig.family;
  const selected = ui._retentionDays === days;
  return Skeletons.Box.Y({
    className: `${pfx}__retpolicy-choice${selected ? ` ${pfx}__retpolicy-choice--selected` : ""}`,
    service: "apps-select-period",
    uiHandler: [ui],
    days,
    kids: [
      Skeletons.Note({
        className: `${pfx}__retpolicy-choice-num`,
        content: String(days),
      }),
      Skeletons.Note({
        className: `${pfx}__retpolicy-choice-unit`,
        content: LOCALE.DAYS || "DAYS",
      }),
      selected
        ? Skeletons.Image.Svg({ ico: "apps-check-circle", className: `${pfx}__retpolicy-choice-check` })
        : null,
    ].filter(Boolean),
  });
}

function toggleSwitch(ui, { service, on }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__retpolicy-switch${on ? ` ${pfx}__retpolicy-switch--on` : ""}`,
    service,
    uiHandler: [ui],
    kids: [Skeletons.Box.X({ className: `${pfx}__retpolicy-switch-knob` })],
  });
}

function toggleItem(ui, { title, body, service, on }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__retpolicy-toggle-item`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__retpolicy-toggle-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__retpolicy-toggle-title`,
            content: title,
          }),
          Skeletons.Note({
            className: `${pfx}__retpolicy-toggle-body`,
            content: body,
          }),
        ],
      }),
      toggleSwitch(ui, { service, on }),
    ],
  });
}

function periodSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__retpolicy-section ${pfx}__retpolicy-section--period`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__retpolicy-section-heading`,
        kids: [
          Skeletons.Image.Svg({ ico: "apps-timer", className: `${pfx}__retpolicy-timer-ico` }),
          Skeletons.Note({
            className: `${pfx}__retpolicy-section-title`,
            content: LOCALE.GLOBAL_RETENTION_PERIOD || "Global Retention Period",
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__retpolicy-section-desc`,
        content:
          LOCALE.GLOBAL_RETENTION_DESC ||
          "Define how long historical versions of files are kept across the entire organization. After this period, older versions will be permanently purged to optimize storage.",
      }),
      Skeletons.Box.X({
        className: `${pfx}__retpolicy-choices`,
        kids: [periodChoice(ui, 30), periodChoice(ui, 60), periodChoice(ui, 90)],
      }),
      toggleItem(ui, {
        title:
          LOCALE.APPLY_IMMEDIATELY_TITLE ||
          "Apply retention immediately on policy change",
        body:
          LOCALE.APPLY_IMMEDIATELY_DESC ||
          "When disabled, existing versions outside the new window are purged on their natural expiry date only.",
        service: "apps-toggle-apply-immediately",
        on: ui._applyImmediately,
      }),
    ],
  });
}

function accessControlSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__retpolicy-section ${pfx}__retpolicy-section--access`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__retpolicy-section-heading`,
        kids: [
          Skeletons.Image.Svg({ ico: "apps-signin", className: `${pfx}__retpolicy-signin-ico` }),
          Skeletons.Note({
            className: `${pfx}__retpolicy-section-title`,
            content: LOCALE.ACCESS_CONTROL || "Access Control",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__retpolicy-toggles`,
        kids: [
          toggleItem(ui, {
            title:
              LOCALE.ALLOW_MEMBERS_VIEW ||
              "Allow members to view version history",
            body:
              LOCALE.ALLOW_MEMBERS_VIEW_DESC ||
              "All workspace members can see the timeline for files they have access to.",
            service: "apps-toggle-members-view",
            on: ui._allowMembersView,
          }),
          toggleItem(ui, {
            title:
              LOCALE.ALLOW_EDITORS_RESTORE ||
              "Allow Editors to restore versions",
            body:
              LOCALE.ALLOW_EDITORS_RESTORE_DESC ||
              "If off, only Workspace Admins can restore. Viewers can never restore.",
            service: "apps-toggle-editors-restore",
            on: ui._allowEditorsRestore,
          }),
        ],
      }),
    ],
  });
}

function footerActions(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__retpolicy-footer`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__retpolicy-footer-info`,
        kids: [
          Skeletons.Image.Svg({ ico: "apps-clock-small", className: `${pfx}__retpolicy-footer-clock` }),
          Skeletons.Note({
            className: `${pfx}__retpolicy-footer-label`,
            content:
              LOCALE.LAST_MODIFIED_INFO ||
              "Last modified by Root Admin 4 days ago.",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__retpolicy-apply-btn`,
        service: "apps-apply-policy",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__retpolicy-apply-label`,
            content: LOCALE.APPLY_RETENTION_POLICY || "Apply retention policy",
          }),
        ],
      }),
    ],
  });
}

export default function retention_policy_view(ui) {
  const pfx = ui.fig.family;
  return [
    backLink(ui),
    Skeletons.Box.Y({
      className: `${pfx}__retpolicy-window`,
      kids: [
        windowHeader(ui),
        Skeletons.Box.Y({
          className: `${pfx}__retpolicy-content`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__retpolicy-bento`,
              kids: [infoCardStorageModel(ui), infoCardReadOnly(ui), infoCardImpact(ui)],
            }),
            Skeletons.Box.X({
              className: `${pfx}__retpolicy-sections`,
              kids: [periodSection(ui), accessControlSection(ui)],
            }),
          ],
        }),
        footerActions(ui),
      ],
    }),
  ];
}
