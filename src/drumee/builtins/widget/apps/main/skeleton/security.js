const folderTemplate = require("../../../../media/grid/template/folder");
const { filesize } = require("@drumee/ui-essentials");

function toggleSwitch(ui, { on, service, extra }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    ...(extra || {}),
    className: `${pfx}__sec-toggle${on ? ` ${pfx}__sec-toggle--on` : ""}`,
    service,
    uiHandler: [ui],
    kids: [Skeletons.Box.X({ className: `${pfx}__sec-toggle-knob` })],
  });
}

function planSwitch(ui) {
  const pfx = ui.fig.family;
  const plan = ui._securityPlan || "normal";
  const opt = (key, label) =>
    Skeletons.Box.X({
      className: `${pfx}__sec-plan-opt${plan === key ? ` ${pfx}__sec-plan-opt--active` : ""}`,
      service: "apps-security-switch-plan",
      uiHandler: [ui],
      security_plan: key,
      kids: [
        Skeletons.Note({
          className: `${pfx}__sec-plan-opt-label`,
          content: label,
        }),
      ],
    });
  return Skeletons.Box.X({
    className: `${pfx}__sec-plan-switch`,
    kids: [
      opt("normal", LOCALE.NORMAL_PLAN || "Normal plan"),
      opt("self-hosting", LOCALE.SELF_HOSTING_PLAN || "Self-hosting"),
    ],
  });
}

function pageHeader(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__sec-header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__sec-page-title`,
        content: LOCALE.SECURITY_GOVERNANCE || "Security Governance",
      }),
      planSwitch(ui),
    ],
  });
}

function twoFactorRow(ui, { key, icon, label, desc, on }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__sec-2fa-row${on ? ` ${pfx}__sec-2fa-row--on` : ""}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__sec-2fa-icon`,
        kids: [
          Skeletons.Image.Svg({
            ico: icon,
            className: `${pfx}__sec-2fa-icon-svg`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__sec-2fa-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__sec-2fa-title`,
            content: label,
          }),
          Skeletons.Note({
            className: `${pfx}__sec-2fa-desc`,
            content: desc,
          }),
        ],
      }),
      toggleSwitch(ui, {
        on,
        service: "apps-security-toggle-2fa",
        extra: { security_2fa_key: key },
      }),
    ],
  });
}

function twoFactorCard(ui) {
  const pfx = ui.fig.family;
  const flags = ui._security2fa || {};
  const isSelfHost = ui._securityPlan === "self-hosting";
  const rows = [
    twoFactorRow(ui, {
      key: "authenticator",
      icon: "apps-devices",
      label: LOCALE.AUTHENTICATOR_APP || "Authenticator App",
      desc:
        LOCALE.AUTHENTICATOR_APP_DESC ||
        "Use Google Authenticator or Authy",
      on: !!flags.authenticator,
    }),
    twoFactorRow(ui, {
      key: "passkeys",
      icon: "apps-lock-padlock",
      label: LOCALE.PASSKEYS_AUTHENTICATION || "PassKeys Authentication",
      desc: LOCALE.PASSKEYS_DESC || "Receive codes via text message",
      on: !!flags.passkeys,
    }),
  ];
  if (isSelfHost) {
    rows.push(
      twoFactorRow(ui, {
        key: "hardware",
        icon: "apps-lock-simple",
        label: LOCALE.HARDWARE_KEYS || "Hardware Keys",
        desc:
          LOCALE.HARDWARE_KEYS_DESC ||
          "YubiKey or compatible security tokens",
        on: !!flags.hardware,
      }),
    );
  }
  return Skeletons.Box.Y({
    className: `${pfx}__sec-2fa-card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__sec-2fa-head`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__sec-2fa-head-title`,
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-lock-shield",
                className: `${pfx}__sec-2fa-head-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__sec-2fa-head-label`,
                content:
                  LOCALE.TWO_FACTOR_AUTH || "Two-Factor Authentication",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__sec-2fa-badge`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__sec-2fa-badge-label`,
                content: LOCALE.RECOMMENDED || "RECOMMENDED",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__sec-2fa-list`,
        kids: rows,
      }),
    ],
  });
}

const SSO_PROVIDERS = [
  { key: "okta", label: "Okta", sub: "ENTERPRISE", brand: "okta" },
  {
    key: "google",
    label: "Google Workspace",
    sub: "ACTIVE",
    brand: "google",
  },
  { key: "azure", label: "Azure AD", sub: "CLOUD AUTH", brand: "azure" },
];

function ssoLogo(pfx, brand, label) {
  const initial = (label || "").trim().slice(0, 1).toUpperCase() || "?";
  return Skeletons.Box.X({
    className: `${pfx}__sec-sso-logo ${pfx}__sec-sso-logo--${brand}`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__sec-sso-logo-initial`,
        content: initial,
      }),
    ],
  });
}

function ssoRow(ui, provider) {
  const pfx = ui.fig.family;
  const flags = ui._securitySso || {};
  const on = !!flags[provider.key];
  return Skeletons.Box.X({
    className: `${pfx}__sec-sso-row${on ? ` ${pfx}__sec-sso-row--on` : ""}`,
    kids: [
      ssoLogo(pfx, provider.brand, provider.label),
      Skeletons.Box.Y({
        className: `${pfx}__sec-sso-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__sec-sso-title`,
            content: provider.label,
          }),
          Skeletons.Note({
            className: `${pfx}__sec-sso-sub`,
            content: provider.sub,
          }),
        ],
      }),
      toggleSwitch(ui, {
        on,
        service: "apps-security-toggle-sso",
        extra: { security_sso_key: provider.key },
      }),
    ],
  });
}

function ssoProvidersCard(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__sec-sso-card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__sec-sso-head`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-network",
            className: `${pfx}__sec-sso-head-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__sec-sso-head-label`,
            content: LOCALE.SSO_PROVIDERS || "SSO Providers",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__sec-sso-list`,
        kids: SSO_PROVIDERS.map((p) => ssoRow(ui, p)),
      }),
    ],
  });
}

function topRow(ui) {
  const pfx = ui.fig.family;
  const isSelfHost = ui._securityPlan === "self-hosting";
  return Skeletons.Box.X({
    className: `${pfx}__sec-top${isSelfHost ? ` ${pfx}__sec-top--split` : ""}`,
    kids: isSelfHost ? [twoFactorCard(ui), ssoProvidersCard(ui)] : [twoFactorCard(ui)],
  });
}

const SECURITY_TAGS = [
  { key: "ipgeo", icon: "apps-globe", label: "IP/GEO" },
  { key: "vpn", icon: "apps-lock-shield", label: "VPN Required" },
  { key: "onetime", icon: "apps-clock", label: "One-time" },
  { key: "managed", icon: "apps-desktop", label: "Managed" },
];

function localizedTagLabel(key, fallback) {
  switch (key) {
    case "ipgeo":
      return LOCALE.IP_GEO || fallback;
    case "vpn":
      return LOCALE.VPN_REQUIRED || fallback;
    case "onetime":
      return LOCALE.ONE_TIME || fallback;
    case "managed":
      return LOCALE.MANAGED || fallback;
    default:
      return fallback;
  }
}

function tagChip(ui, hubId, tag, on) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__sec-tag ${pfx}__sec-tag--${tag.key}${on ? ` ${pfx}__sec-tag--on` : ""}`,
    service: "apps-security-toggle-tag",
    uiHandler: [ui],
    hub_id: hubId,
    security_tag: tag.key,
    kids: [
      Skeletons.Image.Svg({
        ico: tag.icon,
        className: `${pfx}__sec-tag-ico`,
      }),
      Skeletons.Note({
        className: `${pfx}__sec-tag-label`,
        content: localizedTagLabel(tag.key, tag.label),
      }),
    ],
  });
}

function workspaceMeta(h) {
  // _adminHubs rows don't always carry mtime/size; fall back to a humanised
  // placeholder so the layout doesn't collapse.
  const ts = h.mtime || h.updated;
  const bytes = h.filesize != null ? h.filesize : h.size;
  let updated = "";
  if (ts && typeof Dayjs !== "undefined") {
    try {
      updated = Dayjs.unix(ts).fromNow();
    } catch (e) {
      updated = "";
    }
  }
  const size = bytes != null ? filesize(bytes) : "";
  const parts = [];
  if (updated) parts.push((LOCALE.UPDATED || "Updated") + " " + updated);
  if (size) parts.push(size);
  return parts.join(" • ");
}

function workspaceCard(ui, h) {
  const pfx = ui.fig.family;
  const area = h.area || "private";
  const tags = (ui._securityTags && ui._securityTags[h.hub_id]) || {
    ipgeo: true,
    vpn: true,
    onetime: true,
    managed: true,
  };
  const meta = workspaceMeta(h);
  return Skeletons.Box.X({
    className: `${pfx}__sec-card`,
    kids: [
      Skeletons.Element({
        tagName: "div",
        className: `${pfx}__sec-card-ico ${area}`,
        content: folderTemplate({
          area,
          filetype: _a.folder,
          role: "folder",
          widgetId: `sec-${h.hub_id}`,
          isAttachment: 1,
        }),
      }),
      Skeletons.Box.Y({
        className: `${pfx}__sec-card-body`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__sec-card-row`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__sec-card-text`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__sec-card-title`,
                    content: h.hub_name || h.hub_id,
                  }),
                  meta
                    ? Skeletons.Note({
                        className: `${pfx}__sec-card-meta`,
                        content: meta,
                      })
                    : null,
                ].filter(Boolean),
              }),
              Skeletons.Button.Svg({
                ico: "editbox_pencil",
                className: `${pfx}__sec-card-edit`,
                service: "apps-security-edit-hub",
                uiHandler: [ui],
                hub_id: h.hub_id,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__sec-card-tags`,
            kids: SECURITY_TAGS.map((t) =>
              tagChip(ui, h.hub_id, t, !!tags[t.key]),
            ),
          }),
        ],
      }),
    ],
  });
}

function workspaceGrid(ui) {
  const pfx = ui.fig.family;
  const hubs = ui._adminHubs || [];
  if (!hubs.length) {
    if (ui._adminHubsState === "loading") {
      return Skeletons.Box.X({
        className: `${pfx}__sec-empty`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__sec-empty-label`,
            content: LOCALE.LOADING || "Loading…",
          }),
        ],
      });
    }
    return Skeletons.Box.X({
      className: `${pfx}__sec-empty`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__sec-empty-label`,
          content: LOCALE.NO_WORKSPACES || "No workspaces to display.",
        }),
      ],
    });
  }
  return Skeletons.Box.X({
    className: `${pfx}__sec-grid`,
    kids: hubs.map((h) => workspaceCard(ui, h)),
  });
}

export default function securitySkeleton(ui) {
  const pfx = ui.fig.family;
  return [
    Skeletons.Box.Y({
      className: `${pfx}__sec`,
      kids: [
        pageHeader(ui),
        topRow(ui),
        Skeletons.Note({
          className: `${pfx}__sec-section-title`,
          content:
            LOCALE.WORKSPACE_SECURITY_OVERVIEW || "Workspace Security Overview",
        }),
        workspaceGrid(ui),
      ],
    }),
  ];
}
