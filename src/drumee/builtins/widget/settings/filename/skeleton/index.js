const { filesize } = require("@drumee/ui-essentials")
/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function ssettings_filename(ui) {
  let fig = ui.fig.family;

  let ico = 'info';
  let filetype = ui.mget(_a.filetype)
  switch (filetype) {
    case _a.image:
    case _a.video:
      ico = filetype;
      break;
    case _a.document:
      ico = 'ab-note'

  }
  return [
    Skeletons.Button.Svg({
      ico,
      className: `${fig}__filetype icon`,
    }),
    Skeletons.Element({
      className: `${fig}__filepath text`,
      content: ui.mget(_a.filename),
    }),
    Skeletons.Element({
      className: `${fig}__filesize text `,
      content: filesize(ui.mget(_a.filesize))
    }),
  ]
}

export default ssettings_filename;
