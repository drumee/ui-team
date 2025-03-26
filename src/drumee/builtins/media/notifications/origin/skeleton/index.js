const __notification_item = function (_ui_) {
  const pfx = _ui_.fig.family;
  const a = [
    Skeletons.Box.X({
      className: `${pfx}__sender`,
      sys_pn: "sender",
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__sender-container`,
          kids: [
            Skeletons.UserProfile({
              id: _ui_.mget(_a.uid),
              className: `${pfx}__avatar`,
              firstname: _ui_.mget(_a.firstname),
              lastname: _ui_.mget(_a.lastname)
            }),
            Skeletons.Note({
              className: `${pfx}__name`,
              content: _ui_.mget(_a.fullname),
              service: _e.show
            }),
            Skeletons.Box.Y({
              className: `${pfx}__count`,
              service: _e.remove,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__digit`,
                  content: ~~_ui_.mget('new_media') + ~~_ui_.mget('new_message')
                }),
                Skeletons.Button.Svg({
                  ico: "desktop_delete", //"trash"
                  className: `${pfx}__delete`,
                  service: _e.remove
                })
              ]
            })
          ]
        })
      ]
    }),
    Skeletons.List.Smart({
      className: `${pfx}__new-items`,
      sys_pn: "new-items"
    })
  ];

  return a;
};
module.exports = __notification_item;
