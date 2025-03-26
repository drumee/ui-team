// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *
/* __backup_log = (_ui_, data) ->
  pfx = "log"
  a = Skeletons.Box.X 
    className : "#{pfx}-row"
    kids      : [
      Skeletons.Note
        className : "#{pfx}-name"
        content   : data.log
      Skeletons.Note
        className : "#{pfx}-date"
        content   : Dayjs.unix(data.ctime).fromNow()
    ]
 */
const __account_data = function(_ui_) {
  const pfx = _ui_.fig.family; 
  const chart = Skeletons.Box.Y({
    className : `${pfx}__block`,
    kids      : [
      Skeletons.Note({
        className : `${_ui_.fig.group}__title ${pfx}__button`,
        uiHandler : _ui_,
        sys_pn    : "total-size",
        service   : "toggle-view",
        state     : 0
      }),

      Skeletons.Box.X({
        uiHandler     : _ui_,
        sys_pn    : "ref-chart",
        className : `${pfx}__chart ${pfx}__column`,
        kids:[
          {kind:_a.spinner}
        ]})
    ]});

  // history = Skeletons.Box.Y
  //   className : "#{pfx}__block u-jc-sb"
  //   kids      : [
  //     Skeletons.Note
  //       className: "#{_ui_.fig.group}__title #{Visitor.languageClassName()}"
  //       content : LOCALE.LAST_BACKUP
      
  //     Skeletons.List.Smart
  //       className : "#{pfx}__history"
  //       itemsOpt  : __backup_log
  //       api       :
  //         service : SERVICE.drumate.show_backup_log
  //         hub_id  : Visitor.id 
  //         placeholder :  Skeletons.Note
  //           className: "#{_ui_.fig.group}__history-placeholder #{Visitor.languageClassName()}"
  //           content : LOCALE.NO_DATA_SAVED
  //   ]
  
  // footer = ''
  // if Visitor.isB2C()
  const footer = require("./footer")(_ui_);
  
  const overlay = Skeletons.Wrapper.Y({ 
    className: `${pfx}__overlay`,
    name :"overlay"
  });

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    debug     : __filename,
    sys_pn    : "roll-content",
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__container`,
        kids      : [chart]}),
      // footer
      overlay
    ]});

  return a; 
};

module.exports = __account_data;
