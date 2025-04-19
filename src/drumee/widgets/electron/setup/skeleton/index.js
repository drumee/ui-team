const __option = require('../../settings/skeleton/option');


const __skl_electron_setup = function (_ui_) {
  let l = LOCALE;
  const heading = Skeletons.Note({
    className: `${_ui_.fig.family}__heading title`,
    content: l.SYNC_UNCONFIGURED
  });

  let commands = Skeletons.Box.X({
    className: `${_ui_.fig.family}__buttons`,
    kids: [
      Skeletons.Note({
        className: `button save`,
        content: l.SAVE,
        service:_e.save
      }),
      Skeletons.Note({
        className: `button later`,
        content: l.LATER,
        service : 'skip'
      })
    ]
  });


  let message = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__container`,
    kids: [
      __option(_ui_, "disabled", l.NO_SYNC, l.DESK_NO_SYNC_TIPS),
      __option(_ui_, "integral", l.FULL_SYNC, l.DESK_FULL_SYNC_TIPS),
      __option(_ui_, "gradual", l.GRADUAL_SYNC, l.DESK_GRADUAL_SYNC_TIPS),
    ]
  });

  let tooltips = Skeletons.Wrapper.Y({
    sys_pn: `tooltips-wrapper`,
    className: `${_ui_.fig.family}__tooltips-wrapper`,
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__main`,
    kids: [heading, message, tooltips, commands]
  });
};

module.exports = __skl_electron_setup;
