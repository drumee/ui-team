

const __skl_graph = function(_ui_, opt) {
  const figname = "header";
  const header = Skeletons.Box.X({
    className : ` ${_ui_.fig.family}__header ${_ui_.fig.cluster}__header ${_ui_.fig.group}__header`,
    sys_pn    : _a.header,
    kids : [
      Skeletons.Box.X({
        className: `${_ui_.fig.cluster}__title`,
        kids: [
          Skeletons.Note({
            sys_pn    : "ref-window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : "name",
            content   : "Drumee Users's Evolution"
          })
        ]}),

      require('window/skeleton/topbar/control')(_ui_, 'sc')
    ]});
  const body = Skeletons.Box.Y({
    className : `${_ui_.fig.cluster}__container`,
    kids : [
      Skeletons.Note({
        className : `${_ui_.fig.cluster}__forbiden`,
        content   : LOCALE.WEAK_PRIVILEGE
      })
    ]});
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.cluster}__main`, 
    kids        : [header, body]});

  return a;
};
module.exports = __skl_graph;
