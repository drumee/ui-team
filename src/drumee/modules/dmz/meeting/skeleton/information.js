module.exports = function (_ui_, label, extra) {
  const pfx = _ui_.fig.family;
  const a = Skeletons.Box.Y({
    className: `${pfx}__information`,
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: `${pfx}__information-title`,
        content: _ui_.mget(_a.filename)
      }),
      Skeletons.Button.Svg({
        ico: "backoffice_history",
        className: `${pfx}__information-icon`
      }),
      Skeletons.Note({
        className: `${pfx}__information-text`,
        content: label || LOCALE.CONFERENCE_HAS_NOT_STARTED
      })
    ]
  });
  let buttons;
  switch (extra) {
    case "meeting-over":
      buttons = Skeletons.Box.X({
        className: `${pfx}__information-buttons`,
        kids: [
          Skeletons.Note({
            service: "reload",
            className: `${pfx}__information-button rejoin`,
            content: LOCALE.REJOIN
          }),
        ]
      });
      a.kids.push(buttons)
      break;
    case "weak-privilege":
      buttons = Skeletons.Box.X({
        className: `${pfx}__information-buttons`,
        kids: [
          Skeletons.Note({
            service: "reload",
            className: `${pfx}__information-button rejoin`,
            content: LOCALE.REFRESH_PAGE
          })
        ]
      });
      a.kids.splice(0,1,
        Skeletons.Note({
          className: `${pfx}__information-title`,
          content: LOCALE.CONFERENCE_CONNECTION_FAILED
        }),
      )
      a.kids.push(buttons)
      break;
  }

  return a;
};
