
const __skl_screen_selector = function (_ui_) {
  let sources = _ui_.mget('sources');
  sources.map((source) => {
    source.kind = 'screen_thumbnail';
    // source.service = 'select';
    source.radio = `${_ui_.cid}-radio`;
  })
  //console.log(`AAA:38 -- 12`, sources)

  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__header`,
        kids:[
          Skeletons.Note({
            className: `${_ui_.fig.family}__title`,
            content: LOCALE.SELECT_SCREEN_TO_SHARE
          })
        ]
      }),
      Skeletons.List.Smart({
        className: `${_ui_.fig.family}__list`,
        sys_pn: _a.list,
        kids: sources
      }),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__command`,
        kids:[
          Skeletons.Note({
            className: `${_ui_.fig.family}__button cancel`,
            content: LOCALE.CANCEL,
            service : _e.cancel
          }),
          Skeletons.Note({
            className: `${_ui_.fig.family}__button`,
            content: LOCALE.SHARE, 
            service : _e.select
          })
        ]
      })
    ]
  });
};

module.exports = __skl_screen_selector;
