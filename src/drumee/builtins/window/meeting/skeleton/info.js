
__window_webinar_info = function (_ui_) {
    const cancelButton = Skeletons.Box.X({
      className: `${_ui_.fig.family}__row buttons`,
      sys_pn: 'button-wrapper-cancel',
      service: "cancel-dialog",
      kidsOpt: {
        active: 0
      },
      kids: [
        Skeletons.Note({
          className: `${_ui_.fig.family}__button-confirm`,
          content: LOCALE.NO
        })
      ]
    })

    var a;
    a = Skeletons.Box.X({
      className: _ui_.fig.family + "__confirm-container",
      debug: __filename,
      kids: [
        Skeletons.Box.Y({
          className: _ui_.fig.family + "__confirm",
          kids: [
            Skeletons.Note({
              className: `${_ui_.fig.family}__note confirm-message`,
              content: LOCALE.SHARE_SCREEN_WARNING
            }),
            Skeletons.Box.X({
              className: _ui_.fig.family + "__confirm action-btn",
              kids: [
                cancelButton,
                // closeButton
              ]
            })
          ]
        })
      ]
    });
    return a;
  };
  
  module.exports = __window_webinar_info;