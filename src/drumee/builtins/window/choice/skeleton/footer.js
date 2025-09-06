
module.exports = function (ui, message, questions) {
  message = message || ui.megt(_a.message)
  questions = questions || ui.megt('questions') || [LOCALE.CLOSE]

  const pfx = `${ui.fig.group}-choice`;
  let kids = []
  let i = 1;
  for (let q of questions) {
    let c = 'normal';
    if(i == 1) c = 'first'
    kids.push(Skeletons.Note({
      className: `${pfx}__button button ${i} ${c}`,
      service: _a.selection,
      choice: i,
      content: q,
      uiHandler: ui
    }))
    i++;
  }
  const a = Skeletons.Box.X({
    className: `${pfx}__buttons`,
    kids
  });

  return a;
};;
