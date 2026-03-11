module.exports =function(_ui_, content) {
  return Skeletons.Note({
    className  : `mb-20 ${_ui_.fig.group}-tooltips__message`,
    uiHandler  : _ui_,
    debug      : __filename,
    content, 
    state      : 0
  });
};
