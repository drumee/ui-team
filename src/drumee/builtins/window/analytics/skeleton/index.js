

const __skl_graph = function(_ui_, arg) {
  const figname = "header";
  const header = Skeletons.Box.X({
    className : ` ${_ui_.fig.family}__header ${_ui_.fig.group}__header ${_ui_.fig.cluster}__header`,
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
            content   : _ui_.mget(_a.title) || "Drumee Transfer Analytics"
          })
        ]}),

      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]});
  const body = Skeletons.Box.Y({
    className : `${_ui_.fig.cluster}__container`,
    kids : [
      Skeletons.Box.Y({
        sys_pn : _a.content,
        className : `${_ui_.fig.cluster}__container-chart`,
        kids : arg
      })
    ]});
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.cluster}__main`, 
    kids        : [header, body]});

  return a;
};
module.exports = __skl_graph;
