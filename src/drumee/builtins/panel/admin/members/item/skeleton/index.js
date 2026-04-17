module.exports = function (ui) {
  const pfx = ui.fig.family;
  const fname      = ui.mget(_a.firstname) || '';
  const lname      = ui.mget(_a.lastname)  || '';
  const fullname   = ui.mget(_a.fullname)  || `${fname} ${lname}`.trim();
  const email      = ui.mget('email')      || '';
  const role       = ui.mget('role')       || '';
  const workspaces = ui.mget('workspaces') || [];
  const status     = ui.mget('status')     || 'offline';
  const lastActive = ui.mget('last_active')|| '';
  const uid        = ui.mget('drumate_id') || ui.mget(_a.id);
  const selected   = ui.mget('selected')   ? 1 : 0;

  const wsTags = (Array.isArray(workspaces) ? workspaces : [workspaces])
    .filter(Boolean)
    .map((ws) => Skeletons.Note({ className: `${pfx}__ws-tag`, content: ws }));

  return Skeletons.Box.X({
    className: `${pfx}__row`,
    dataset: { selected },
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__checkbox`,
        icons: ['editbox_shapes-roundsquare', 'available'],
        sys_pn: 'checkbox',
        state: selected,
        service: 'toggle-select',
        uiHandler: [ui],
      }),
      Skeletons.UserProfile({
        className: `${pfx}__avatar`,
        id: uid,
        firstname: fname || fullname,
        lastname: lname,
        fullname,
        type: 'thumb',
      }),
      Skeletons.Box.Y({
        className: `${pfx}__identity`,
        kids: [
          Skeletons.Note({ className: `${pfx}__name`,  content: fullname }),
          Skeletons.Note({ className: `${pfx}__email`, content: email }),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__role-tag`, content: role }),
      Skeletons.Box.X({ className: `${pfx}__workspaces`, kids: wsTags }),
      Skeletons.Box.X({
        className: `${pfx}__status ${status}`,
        kids: [
          Skeletons.Note({ className: `${pfx}__status-dot` }),
          Skeletons.Note({ className: `${pfx}__status-text`, content: status }),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__last-active`, content: lastActive }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          Skeletons.Button.Svg({ className: `${pfx}__edit-btn`,   ico: 'edit',         service: 'edit-member',   uiHandler: [ui] }),
          Skeletons.Button.Svg({ className: `${pfx}__delete-btn`, ico: 'tools_delete', service: 'delete-member', uiHandler: [ui] }),
        ],
      }),
    ],
  });
};
