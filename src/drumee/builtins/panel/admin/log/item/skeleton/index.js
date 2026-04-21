module.exports = function (ui) {
  const pfx       = ui.fig.family;
  const fname     = ui.mget(_a.firstname) || '';
  const lname     = ui.mget(_a.lastname)  || '';
  const fullname  = ui.mget(_a.fullname)  || `${fname} ${lname}`.trim();
  const email     = ui.mget('email')      || '';
  const uid       = ui.mget('drumate_id') || ui.mget(_a.id);
  const action    = ui.mget('action')     || '';
  const resource  = ui.mget('resource')   || '';
  const resIco    = ui.mget('resource_ico') || 'file';
  const timestamp = ui.mget('timestamp')  || '';
  const actionMod = action.replace(/\./g, '-').toLowerCase();

  return Skeletons.Box.X({
    className: `${pfx}__row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__col user`,
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
            className: `${pfx}__identity`,
            kids: [
              Skeletons.Note({ className: `${pfx}__name`,  content: fullname }),
              Skeletons.Note({ className: `${pfx}__email`, content: email }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__col action`,
        kids: [
          Skeletons.Note({ className: `${pfx}__action-badge ${actionMod}`, content: action }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__col resource`,
        kids: [
          Skeletons.Image.Svg({ ico: resIco, className: `${pfx}__res-ico` }),
          Skeletons.Note({ className: `${pfx}__res-name`, content: resource }),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__col timestamp`, content: timestamp }),
    ],
  });
};
