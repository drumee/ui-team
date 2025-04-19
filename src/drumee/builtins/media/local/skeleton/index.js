/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/widget/help-item/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/


//const Diff = require('text-diff');
//const mimetype = require('dataset/mimetype.json');

function __skl_sync_file_item(_ui_) {
  const pfx = _ui_.fig.family;
  const pfx2 = `${pfx}__filepath`
  let nodetype = _ui_.mget('nodetype') || _ui_.mget(_a.filetype);

  let filepath = Skeletons.Box.Y({
    className: `${pfx2}-container`,
    kids : [
      Skeletons.Note({
        className: `${pfx2}`,
        content: _ui_.mget(_a.filepath),
      })
    ]
  })

  if (_ui_.mget(_a.src) && _ui_.mget('dest')) {
    filepath.kids = [
      Skeletons.Note({
        className: `${pfx2} oldname`,
        content: _ui_.mget(_a.src),
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__icon changed`,
        ico: 'arrow-down'
      }),
      Skeletons.Note({
        className: `${pfx2}`,
        content: _ui_.mget('dest'),
      })
    ]
  } 
  let content = '';
  let m = _ui_.model.toJSON();
  m.filetype = m.filetype || nodetype;
  m.ext = m.filetype || nodetype;
  if (/^(hub|folder)$/.test(nodetype)) {
    content = require('builtins/media/grid/template/preview')(m);
  }else{
    content = require('builtins/media/grid/template/preview')(m);
  }
  const a = Skeletons.Box.X({
    className: `${pfx}__content`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__icon ${_ui_.mget(_a.filetype)}`,
        content,
      }),
      filepath
    ]
  })
  return a;
}

export default __skl_sync_file_item;