/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/pages/broadcast-message/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_broadcast_message_page  (_ui_) {
  const broadcastFig = _ui_.fig.family

  const header = Skeletons.Box.X({
    className  : `${broadcastFig}__header`,
    kids       : [
      Skeletons.Note({
        className  : `${broadcastFig}__note header`,
        content    : LOCALE.BROADCAST_MESSAGE //'Broadcast message'
      }),

      Skeletons.Button.Svg({
        className : `${broadcastFig}__icon select-member contact_add`,
        ico       : 'drumee-contact_add' //'contact_add'
      })
    ]
  })

  const content = Skeletons.Box.X({
    className  : `${broadcastFig}__content`,
    kids       : [
      Skeletons.EntryBox({
        className     : `${broadcastFig}__entry broadcast-message`,
        type          : _a.textarea,
        name          : 'broadcast',
        formItem      : 'broadcast',
        innerClass    : 'broadcast-message',
        placeholder   : LOCALE.YOUR_MSG || '',
        errorHandler  : [_ui_],
        validators    : [
          { reason  : 'require', comply : Validator.require }
        ]
      })
    ]
  })

  const footer = Skeletons.Box.X({
    className  : `${broadcastFig}__footer`,
    kids: [
      Skeletons.Box.Y({
        className : `${broadcastFig}__buttons-wrapper button`,
        service   : _e.submit,
        uiHandler : _ui_,
        kidsOpt   : {
          active : 0
        },
        kids      : [
          Skeletons.Note({
            content: LOCALE.SEND
          })
        ]
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${broadcastFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className   : `${broadcastFig}__container`,
        kids        : [
          header,
          content,
          footer
        ]
      })
    ]
  })

  return a;
}

export default __skl_broadcast_message_page