
module.exports = function(ui, mode) {
  const cancelType = ui.mget('cancel_type') || 'secondary';
  const confirmType = ui.mget('confirm_type') || 'danger';
  const btnClass = ui.mget('buttonClass') || '';

  const pfx = `${ui.fig.group}-confirm`;

  const a = Skeletons.Box.X({
    className: `${pfx}__buttons ${btnClass}`,
    kids: [
      Skeletons.Note({
        className : `${pfx}__button-${cancelType} button`,
        signal    : _e.cancel,
        content   : ui.mget(_a.cancel) || LOCALE.CANCEL,
        uiHandler : ui 
      }),
      Skeletons.Note({
        className : `${pfx}__button-${confirmType} button`,
        signal    : _e.confirm,
        content   : ui.mget(_a.confirm)|| LOCALE.YES,
        uiHandler : ui 
      })
    ]
  });
  if (/f1/.test(mode)) {
    a.kids.pop();
  }
  
  return a;
};;
