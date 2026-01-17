
export default function (ui) {
  let footer = "";
  if ([_a.share, _a.dmz].includes(ui.mget(_a.area))) {
    footer = require('./links').default(ui)
  }
  let title = LOCALE.FOLDER_INFO;
  if(ui.isRegularFile) title = 'File info'
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    sys_pn: "main-content",
    kids: [
      require('../../skeleton/header').default(ui, title),
      require('./content').default(ui),
      footer,
      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__overlay`,
        partHandler: [ui],
        sys_pn: "overlay",
      }),
    ]
  });

}


