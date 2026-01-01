// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/content/reset-member-password.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_reset_password_link (_ui_) {
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
  
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${contentFig}__content reset-member-password`,
    kids        : [
      content,
    ]
  });

  return a;
};

export default __skl_reset_password_link;
