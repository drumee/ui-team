// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/sharebox/skeleton/username.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_meeting_username(_ui_, service=_e.hello) {
  const usernameFig = `${_ui_.fig.family}-username`
  const title = Skeletons.Box.X({
    className: `${usernameFig}__title`,
    kids: [
      Skeletons.Note({
        className: `${usernameFig}__note title`,
        content: _ui_.mget("filename")
      })
    ]
  })

  //const messageBox = 
  let display = _ui_.firstname || _ui_.username || '';
  if(/^(nobody|anonymous)/i.test(display)){
    display = '';
  }
  const username = Skeletons.Box.Y({
    className: `${usernameFig}__input`,
    sys_pn: 'wrapper-username',
    partHandler: [_ui_],
    kids: [
      Skeletons.Note({
        className: `${usernameFig}__input-text`,
        content: LOCALE.ENTER_NAME_TO_JOIN_CONFERENCE
      }),
      Skeletons.EntryBox({
        className: `${usernameFig}__input-entry`,
        placeholder: LOCALE.ENTER_YOUR_NAME,
        sys_pn: 'ref-username',
        service,
        mode: _a.commit,
        uiHandler: _ui_,
        partHandler: [_ui_],
        value: display,
        select:1,
        focus:1
      }),
      Skeletons.Wrapper.Y({
        className: `${usernameFig}__row message-wrapper message no-background`,
        sys_pn: 'message-box',
        partHandler: [_ui_],
      })
    ]
  })

  const button = Skeletons.Box.X({
    className: `${usernameFig}__row buttons`,
    sys_pn: 'button-wrapper',
    service,
    uiHandler: _ui_,
    partHandler: [_ui_],
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${usernameFig}__button-confirm`,
        content: LOCALE.JOIN_MEETING
      })
    ]
  })


  const a = Skeletons.Box.Y({
    className: `${usernameFig}__main`,
    debug: __filename,
    kids: [
      title,
      Skeletons.Box.X({
        className: `${usernameFig}__waiting`,
        kids: [
          Skeletons.Button.Svg({
            ico: "backoffice_history",
            className: `${usernameFig}__waiting-icon`
          }),
        ]
      }),
      Skeletons.Box.Y({
        className: `${usernameFig}__content`,
        kids: [
          //messageBox,
          username,
          button,
        ]
      })
    ]
  });

  return a;

};

export default __skl_dmz_meeting_username;
