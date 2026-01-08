
module.exports = function(ui) {
  return Skeletons.Box.X({ 
    className : `${ui.fig.group}__container-commands`,
    debug     : __filename,
    sys_pn    : "ref-actions-bar-footer",
    kids :[
      Skeletons.Note({
        className : `${ui.fig.group}__container--secondary-btn`,
        uiHandler : [ui], 
        service   : 'cancel-share',
        editable  : 1,
        content   : LOCALE.CANCEL 
      }),
       Skeletons.Box.X({ 
        className : "",
        debug     : __filename,
        sys_pn    : "ref-actions-bar",
        dataset   : {
          active  : ui.getState()
        },
        kids :[
          Skeletons.Note({
            className : "dialog__button--submit",
            uiHandler : ui, 
            service   :  _e.share,
            editable  : 1,
            content   : LOCALE.SAVE
          })
        ]
       })
    ]
  });

};
