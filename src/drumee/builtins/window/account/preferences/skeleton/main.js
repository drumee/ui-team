const __preferences = function(_ui_) {

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    kids: [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__container`,
        sys_pn    : "preferences-block",
        debug     : __filename,
        kids: [
          Skeletons.Box.Y({
            className: `${_ui_.fig.family}__wallpapers`,
            sys_pn: "preferences-wallpapers",
            kids: [
              Skeletons.Note({
                content     : LOCALE.DESKTOP_WALLPAPER,
                className   : `${_ui_.fig.family}__label clickable pl-7`,
                useKeyEvent : 1,
                uiHandler       : _ui_, 
                service     : "personnal-photo"
              }), 
              
              require("./wallpaper")(_ui_)
            ]}),
          
          Skeletons.Box.Y({
            className: `${_ui_.fig.family}__language`,
            kids: [
              Skeletons.Note({
                content     :LOCALE.LANGUAGE,
                className: `${_ui_.fig.family}__label language`
              }),
              
              require("./languages")(_ui_)
            ]})
          
        ]})
      
      //require("../../skeleton/footer")(_ui_)

    ]});
  
  return a;
};

module.exports = __preferences;
