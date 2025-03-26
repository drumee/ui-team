// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : /src/drumee/builtins/window/adminpanel/widget/members/skeleton/breadcrumbs.js
//   TYPE : Skeleton
// ==================================================================== *
/// <reference path="../../../../../../../../@types/index.d.ts" />

// ===========================================================
//
// ===========================================================
function __skl_members_page_breadcrumbs (_ui_) {

  const breadcrumbsFig = `${_ui_.fig.family}-breadcrumbs`;

  const backButton = Skeletons.Button.Svg({
    ico       : 'arrow--map',
    className : `${breadcrumbsFig}__icon breadcrumb-icon back arrow--map`,
    service   : 'previous-page',
    uiHandler : _ui_
  });

  const nextButton = Skeletons.Button.Svg({
    ico       : 'arrow--map',
    className : `${breadcrumbsFig}__icon breadcrumb-icon next arrow--map`,
    service   : 'next-page',
    uiHandler : _ui_
  });
  
  const a = Skeletons.Box.X({
    debug       : __filename, 
    className   : `${breadcrumbsFig}__container adminpanel-members`,
    sys_pn      : 'members-breadcrumbs-container',
    partHandler : _ui_,
    state       : 0,
    kids        : [
      Skeletons.Box.X({
        kids: [
          backButton,
          nextButton
        ]})
    ]});

  return a;
};

export default __skl_members_page_breadcrumbs;
