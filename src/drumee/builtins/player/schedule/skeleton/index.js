
const __tooltips = function (_ui_, content, className) {
  let a;
  if (className == null) { className = ''; }
  return a = {
    className: `${_ui_.fig.family}__tooltips ${_ui_.fig.name}-tooltips ${className}`,
    content
  };
};

const __skl_schedule_details = function (_ui_) {
  const pfx = _ui_.fig.family;
  const header = Skeletons.Box.X({
    className: `${pfx}__header ${_ui_.fig.group}__header`,
    kids: [require('./topbar')(_ui_)],
    sys_pn: _a.header
  });

  const dialog = Skeletons.Wrapper.Y({
    className: `${_ui_.fig.group}__wrapper--modal dialog__wrapper--modal ${_ui_.fig.family}__wrapper--modal`,
    name: "dialog"
  });


  const date = Skeletons.Box.Y({
    className: `${pfx}__date-wrapper`,
    sys_pn: 'date-wrapper',
    kids: [
      require('./date')(_ui_)
    ]
  });

  const description = Skeletons.Box.Y({
    className: `${pfx}__description-wrapper`,
    sys_pn: 'description-wrapper',
    kids: [
      require('./description')(_ui_)
    ]
  });

  const attendees = Skeletons.Box.Y({
    className: `${pfx}__attendees-wrapper`,
    sys_pn: 'attendees-wrapper',
    kids: [
      require('./attendees')(_ui_)
    ]
  });

  const delButton = Skeletons.Button.Svg({
    ico: "tools_delete",
    className: "button icon delete-btn",
    tooltips: __tooltips(_ui_, LOCALE.DELETE_MEETING, 'delete-btn-tooltip'),
    service: 'delete-popup'
  });

  const copyButton = Skeletons.Button.Svg({
    ico: "editbox_link",
    className: "button icon copy-button",
    tooltips: __tooltips(_ui_, LOCALE.COPYLINK, 'copy-btn-tooltip'),
    service: _e.copy
  });

  const buttons = Skeletons.Box.X({
    className: `${pfx}__buttons`,
    kids: [
      Skeletons.Note({
        content: LOCALE.START_MEETING,
        className: "button text primary",
        service: _e.start
      })
    ]
  });

  const body = Skeletons.Box.Y({
    className: `${pfx}__body`,
    sys_pn: _a.content,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title title `,
        content: LOCALE.EXTERNAL_CALL_DETAIL
      }),

      delButton,
      copyButton,
      Skeletons.Box.Y({
        className: `${pfx}__details`,
        kids: [date, description, attendees]
      }),
      buttons
    ]
  });

  const footer = Skeletons.Box.Y({
    className: `${pfx}__footer`,
    sys_pn: _a.footer
  });


  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__main`,
    kids: [
      header,
      Skeletons.Box.Y({
        className: `${pfx}__bdy_footer`,
        kids: [body, footer, dialog]
      })
    ]
  });

  return a;
};

module.exports = __skl_schedule_details;
