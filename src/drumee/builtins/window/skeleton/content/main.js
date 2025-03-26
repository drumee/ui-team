const __skl_window_content_main = function(_ui_, header, size) {
  size = size || _ui_.size;
  if (size.height < 291) {
    size.height = 291;
  }

  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body ${_ui_.fig.group}__body`,
    sys_pn   : _a.content,
    attrOpt  : { 
      placeholder : LOCALE.DROP_SECTIONS_HERE
    },
    type: _a.type
  });

  const fsel = require('skeleton/file-selector')();

  header.service = _e.raise; 

  const dialog = Skeletons.Wrapper.Y({
    className : `${_ui_.fig.group}__wrapper--modal dialog__wrapper--modal ${_ui_.fig.family}`,
    name      : "dialog"
  });
  const tooltips =  Skeletons.Wrapper.Y({
    className : `${_ui_.fig.group}__wrapper-container`,
    name      :  "tooltips"
  });

  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio      : _a.parent,
    debug      : __filename,
    kids       : [header, tooltips, body, fsel, dialog]});
  
  return a;
};
module.exports = __skl_window_content_main;
