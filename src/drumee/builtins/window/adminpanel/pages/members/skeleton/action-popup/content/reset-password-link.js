
export default function (_ui_) {
  const contentFig = `${_ui_.fig.family}-action-popup-confirmation`;

  const content = Skeletons.Box.Y({
    className  : `${contentFig}__content`,
    kids: [
      Skeletons.Note({
        className : `${contentFig}__note sub-header`,
        content   : LOCALE.RESET_LINK_READY
      }),
    ]
  })
  
  
  return Skeletons.Box.Y({
    debug       : __filename,
    className   : `${contentFig}__content reset-member-password`,
    kids        : [
      content,
    ]
  });
};

