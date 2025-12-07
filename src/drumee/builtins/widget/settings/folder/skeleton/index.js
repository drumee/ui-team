
export default function (ui) {
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      require('../../skeleton/header').default(ui),
      require('./content').default(ui)
    ]
  });

}


