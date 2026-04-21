module.exports = function (ui) {
  const pfx      = ui.fig.family;
  const fname    = ui.mget(_a.firstname) || '';
  const lname    = ui.mget(_a.lastname)  || '';
  const fullname = ui.mget(_a.fullname)  || `${fname} ${lname}`.trim();
  const uid      = ui.mget('drumate_id') || ui.mget(_a.id);
  const timeAgo  = ui.mget('time_ago')   || '';
  const tags     = ui.mget('tags')       || [];

  const tagList = (Array.isArray(tags) ? tags : [tags])
    .filter(Boolean)
    .map((t) => Skeletons.Note({ className: `${pfx}__tag`, content: t }));

  return Skeletons.Box.X({
    className: `${pfx}__row`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__avatar`,
        id: uid,
        firstname: fname || fullname,
        lastname: lname,
        fullname,
        type: 'thumb',
      }),
      Skeletons.Box.Y({
        className: `${pfx}__info`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__info-top`,
            kids: [
              Skeletons.Note({ className: `${pfx}__creator`, content: `${fullname} ${LOCALE.CREATED || 'created'}` }),
              Skeletons.Box.X({ className: `${pfx}__tags`, kids: tagList }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__time-row`,
            kids: [
              Skeletons.Image.Svg({ ico: 'clock', className: `${pfx}__clock-ico` }),
              Skeletons.Note({ className: `${pfx}__time-ago`, content: timeAgo }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          Skeletons.Button.Label({
            className: `${pfx}__approve-btn`,
            ico: 'check',
            label: LOCALE.APPROVE,
            service: 'approve-request',
            uiHandler: [ui],
          }),
          Skeletons.Button.Label({
            className: `${pfx}__reject-btn`,
            ico: 'close',
            label: LOCALE.REJECT,
            service: 'reject-request',
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
