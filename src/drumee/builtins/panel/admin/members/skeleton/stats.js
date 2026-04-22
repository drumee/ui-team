module.exports = function (ui) {
  const pfx = ui.fig.family;
  const cards = [
    { pn: 'stat-total',   label: LOCALE.TOTAL_MEMBERS,   key: 'total_members',   mod: ''       },
    { pn: 'stat-admins',  label: LOCALE.ADMINS,          key: 'admin_count',     mod: 'blue'   },
    { pn: 'stat-guests',  label: LOCALE.EXTERNAL_GUESTS, key: 'guest_count',     mod: 'pink'   },
    { pn: 'stat-pending', label: LOCALE.PENDING_INVITES, key: 'pending_invites', mod: 'orange' },
  ];
  return Skeletons.Box.X({
    className: `${pfx}__stats`,
    kids: cards.map((c) =>
      Skeletons.Box.Y({
        className: `${pfx}__stat-card ${c.mod}`,
        kids: [
          Skeletons.Note({ className: `${pfx}__stat-label`, content: c.label }),
          Skeletons.Note({ className: `${pfx}__stat-value ${c.mod}`, content: ui.mget(c.key) || '—', sys_pn: c.pn }),
        ],
      })
    ),
  });
};
