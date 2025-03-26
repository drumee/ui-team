// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const __media_notification = function(_ui_) {
  const pfx = _ui_.fig.family; 
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className: `${pfx}__main account`,
    kids: [
      Skeletons.Box.X({
        className   : `${pfx}__header`,
        kids : [
          Skeletons.Note({
            sys_pn    : "ref-window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : `${pfx}__title`,
            content   : "Notifications"
          }),
          Skeletons.Button.Svg({
            ico : "desktop_delete", //"trash"
            className: `${pfx}__item ack`, 
            //label: LOCALE.CLEAR_NOTIFICATIONS
            service : _e.clear
          })
        ]}),
      Preset.Button.Cross(_ui_, _e.close, `${pfx}__button--close`),
      Skeletons.List.Smart({
        className   : `${pfx}__item list`,
        placeholder : Skeletons.Note('', 'drumee-spinner'),
        itemsOpt    : { 
          kind      : 'media_origin',
          uiHandler : _ui_
        },
        spinnerWait : 1500,
        spinner     : true,
        sys_pn      : _a.list, 
        api         : _ui_.getCurrentApi
      })

//      Skeletons.Button.Svg
//        ico : "desktop_delete" #"trash"
//        className: "#{pfx}__item ack" 
//        #label: LOCALE.CLEAR_NOTIFICATIONS
//        service : _e.clear
    ]});
  
  return a;
};
module.exports = __media_notification;
