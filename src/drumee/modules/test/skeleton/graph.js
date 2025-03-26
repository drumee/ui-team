

const __skl_graph = function(_ui_, opt) {

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__graph-container`,
    kids : [
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__chart-line`,
        kids : [{
          ...opt,
          kind: 'chart_line'
        }]})
    ]});
  return a;
};
module.exports = __skl_graph;
