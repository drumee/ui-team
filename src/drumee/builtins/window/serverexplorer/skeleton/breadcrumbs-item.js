// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/skeleton/breadcrumbs-item.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __breadcrumbs_item = function(_ui_, item) {
  let filename = item[_a.filename];
  if (_.isEmpty(filename)) {
    filename = '/';
  }

  const folderIcon = 'raw-drumee-folder-blue';
  const iconColor = 'blue';

  const a = Skeletons.Box.X({
    debug : __filename,
    className  : `${_ui_.fig.group}-breadcrumbs__item`,
    uiHandler  : [_ui_],
    filetype   : _a.folder,
    service    : _a.openLocation,
    filename,
    path       : item[_a.path],
    role       : _a.breadcrumbs,
    kidsOpt: {
      active : 0
    },
    kids : [
      Skeletons.Button.Svg({
        ico        : folderIcon,
        className  : `${_ui_.fig.group}-breadcrumbs__item--icon ${iconColor}`
      }),
      
      Skeletons.Note({
        content    : filename,
        className  : `${_ui_.fig.group}-breadcrumbs__item--filename filename`
      })
    ]});
  return a;
};

module.exports = __breadcrumbs_item;
