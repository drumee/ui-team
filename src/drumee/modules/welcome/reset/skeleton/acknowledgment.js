function __skl_welcome_reset_acknowledgment (_ui_, _label, type = '') {
  const ackFig = _ui_.fig.family

  let acknowledgment =  Skeletons.Note({
    className  : `${ackFig}__note message`,
    content    : _label
  })

  if (type == 'reset_token') {
    acknowledgment = Skeletons.Box.X({
      className  : `${ackFig}__message-wrapper`,
      kids       : [
        Skeletons.Button.Svg({
          ico       : 'editbox_checkmark',
          className : `${ackFig}__icon acknowledgment editbox_checkmark`,
        }),

        Skeletons.Note({
          className  : `${ackFig}__note message`,
          content    : LOCALE.EMAIL_HAS_BEEN_SENT_TO_YOU
        })
      ]
    })
  }
  
  return acknowledgment;
}

export default __skl_welcome_reset_acknowledgment