// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : account/current/profile/skeleton/main.coffee
//   TYPE :
// ==================================================================== *



const __skl_window_account_profile = function(_ui_) {
  const accFig = _ui_.fig.family;

  const a = Skeletons.Box.Y({
    className : `${accFig}__main`,
    kids      : [
      Skeletons.Box.X({
        className : `${accFig}__container`,
        kids      : [
          Skeletons.Box.Y({
            className : `${accFig}__container-avatar`,
            kids      : [
              {
                kind      : 'account_avatar',
                trigger   : _ui_.mget(_a.trigger),
                uiHandler : _ui_
              }
            ]}),
          
          Skeletons.Box.Y({
            className: `${accFig}__container-form`,
            kids: [require('./form')(_ui_)]})
        ]})
    ]});

  return a;
};

module.exports = __skl_window_account_profile;
