const __viewer_body = function (view) {
  const a = [
    Skeletons.Box.Y({ sys_pn: 'body_left' }),
    Skeletons.Box.Y({
      sys_pn: _a.center, className: view.fig.family + "__body"
    }),
    Skeletons.Box.Y({ sys_pn: 'body_right' })
  ];
  return a;
};
module.exports = __viewer_body;
