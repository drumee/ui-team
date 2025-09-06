
module.exports = function(_ui_, mode) {
  const cancelType = _ui_.mget('cancel_type') || 'secondary';
  const confirmType = _ui_.mget('confirm_type') || 'danger';
  const btnClass = _ui_.mget('buttonClass') || '';

  const pfx = `${_ui_.fig.group}-confirm`;

  const a = Skeletons.Box.X({
    className: `${pfx}__buttons ${btnClass}`,
    kids: [
      Skeletons.Note({
        className : `${pfx}__button-${cancelType} button`,
        signal    : _e.cancel,
        content   : _ui_.mget(_a.cancel) || LOCALE.CANCEL,
        uiHandler : _ui_ 
      }),
      Skeletons.Note({
        className : `${pfx}__button-${confirmType} button`,
        signal    : _e.confirm,
        content   : _ui_.mget(_a.confirm)|| LOCALE.YES,
        uiHandler : _ui_ 
      })
    ]
  });
  if (/f1/.test(mode)) {
    a.kids.pop();
  }
  
  return a;
};;
