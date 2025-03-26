const __sandbox_menu = function(_ui_) {
  const fig = `${_ui_.fig.family}`;
  const _trigger = Skeletons.Note({ 
    content  : "I'm a dropdown menu. Click to try",
    styleOpt : { 
      width : 300,
      textAlign : "center",
      fontSize  : "20px"
    }
  });

  const _items = Skeletons.Box.Y({
    anim      : require('./slide-x')(),
    className : `${fig}__menu-items`,
    flow      : _a.vertical,
    kidsOpt: {
      radio   : _a.on,
      service : "sandbox-service",
      className : `${fig}__menu-item`,
      styleOpt : {
        fontSize : "30px",
        textAlign : "center"
      }
    },
    kids      : [
      Skeletons.Note({content:"Item 1", name:"Item 1"}),
      Skeletons.Note({content:"Item 2", name:"Item 2"}),
      Skeletons.Note({content:"Item 3", name:"Item 2"}),
      Skeletons.Note({content:"Item 4", name:"Item 2"})
    ]});

  const menu = Skeletons.Box.X({
    className: `${fig}__menu-box`,
    styleOpt : {
      width  : "auto",
      margin : "30px auto",
      textAlign : "center"
    },
    kids: [{
      kind        : KIND.menu.topic,
      className   : `${fig}__menu-ui`,
      flow        : _a.y,
      opening     : _e.click,
      trigger     : _trigger,
      items       : _items
    }]});

  _trigger.content = "But I can do otherway as well!";
  const menu2 = Skeletons.Box.X({
    className: `${fig}__menu-box-horizontal`,
    styleOpt : {
      width  : "auto",
      margin : "30px auto",
      textAlign : "center"
    },
    kids: [{
      kind        : KIND.menu.topic,
      className   : `${fig}__menu-ui`,
      flow        : _a.x, 
      axis        : _a.x,
      direction   : _a.right,
      opening     : _e.click,
      trigger     : _trigger,
      items       : _items
    }]});

  const a = 
    Skeletons.Box.Y({
      className: `${fig}__menu-main`,
      styleOpt: { 
        width: "100%",
        height: "100%"
      },
      tips:"Add a new item at the end of the dropdown menu.",
      kids: [ menu, menu2]});
  return a;
};

module.exports =  __sandbox_menu;
