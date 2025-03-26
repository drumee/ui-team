// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/modules/desk/skeleton/topbar/share-bar
//   TYPE : 
// ==================================================================== *

const __desk_top_share_bar = function(_ui_) {
  let note;
  const mimicInfo = Visitor.get('mimic_entity');
  let title = '';
  if (Visitor.get('mimic_type') === _a.mimic) {
    title = `${Visitor.get('fullname')} `+ 'desktop';
  }
  if (Visitor.get('mimic_type') === _a.victim) {
    title = `${mimicInfo.surname} ` + 'is using your desktop';
  }
  
  const a = Skeletons.Box.X({
    sys_pn    : "share-bar",
    className : `${_ui_.fig.family}__share-bar`,
    kids      : [
      Skeletons.Box.X({
        sys_pn    : "share-bar-title",
        className : `${_ui_.fig.family}__share-bar-title`,
        kids: [
          Skeletons.Note({
            content: title})
        ]}),
      
      Skeletons.Box.X({
        sys_pn    : "share-bar-suffix",
        className : `${_ui_.fig.family}__share-bar-suffix`,
        kids: [
          (note = { 
            kind      : 'countdown_timer',
            sys_pn    : "share-bar-countdown-timer",
            className : `${_ui_.fig.family}__share-bar-timer`,
            from      : Dayjs(),
            to        : Dayjs.unix(Visitor.get('mimic_end_at'))
          }),
            
          Skeletons.Note({
            className : 'share_bar_disconnect-btn',
            content   : LOCALE.DISCONNECT,//"Disconnect"
            service   : 'disconnect-shared'
          }) 
        ]})
    ]});
  return a;
};

module.exports = __desk_top_share_bar;
