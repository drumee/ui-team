
module.exports = function (ui, header, size) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}__container-header mt-6`,
        kids: [
          Skeletons.Note({
            className: `${ui.fig.family}__value-filesize ml-6`,
            sys_pn: "ref-filesize",
            content: "0Mb"
          }),
          Skeletons.Note({
            className: `${ui.fig.family}__value-percent mr-6`,
            sys_pn: "ref-percent",
            content: "0%"
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__container-body`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.family}__chart`,
            sys_pn: "ref-chart"
          }),
          Skeletons.Button.Svg({
            ico: "cross",
            className: `${ui.fig.family}__close close`,
            service: _e.cancel
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__container-footer mb-4`,
        kids: [
          Skeletons.Note({
            className: `${ui.fig.family}__value-filename`,
            sys_pn: "ref-filename",
            content: ui.mget(_a.filename) || "xxx.doc"
          })
        ]
      })
    ]
  });
};
