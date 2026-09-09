// Resolved per render, NOT at module scope. A module-level `LOCALE.*` read
// would freeze the strings at import time — which is fine while this module
// is only reached through a lazy import(), but silently ships key names the
// day anything requires it earlier, and there is no reason to depend on that.
const securityTags = () => [
  { key: 'ip_geo',       ico: 'globe',    label: LOCALE.IP_GEO       },
  { key: 'vpn_required', ico: 'lock',     label: LOCALE.VPN_REQUIRED },
  { key: 'one_time',     ico: 'clock',    label: LOCALE.ONE_TIME     },
  { key: 'managed',      ico: 'monitor',  label: LOCALE.MANAGED      },
];

module.exports = function (ui) {
  const pfx      = ui.fig.family;
  const name     = ui.mget(_a.name)      || '';
  const updated  = ui.mget('updated')    || '';
  const size     = ui.mget('size')       || '';

  const tags = securityTags().map((t) =>
    Skeletons.Box.X({
      className: `${pfx}__tag`,
      kids: [
        Skeletons.Image.Svg({ ico: t.ico, className: `${pfx}__tag-ico` }),
        Skeletons.Note({ className: `${pfx}__tag-label`, content: t.label }),
      ],
    })
  );

  return Skeletons.Box.X({
    className: `${pfx}__card`,
    kids: [
      Skeletons.Image.Svg({ ico: 'folder', className: `${pfx}__folder-ico` }),
      Skeletons.Box.Y({
        className: `${pfx}__card-info`,
        kids: [
          Skeletons.Note({ className: `${pfx}__ws-name`, content: name }),
          Skeletons.Note({
            className: `${pfx}__ws-meta`,
            content: [updated, size].filter(Boolean).join(' · '),
          }),
          Skeletons.Box.X({ className: `${pfx}__tags`, kids: tags }),
        ],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__edit-btn`,
        ico: 'edit',
        service: 'edit-workspace-security',
        uiHandler: [ui],
      }),
    ],
  });
};
