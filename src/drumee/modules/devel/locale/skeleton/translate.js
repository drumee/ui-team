
const __locale_row = function(_ui_, data) {


  const bar = Skeletons.Box.X({
    className: `${_ui_.fig.family}__buttons`,
    kids: [
      Skeletons.Button.Svg({
        ico:"raw-icons_svg_g_1_left", 
        sys_pn : 'previous-item',
        className : `${_ui_.fig.family}__icon navigate`,
        service : 'load-item',
        name : 'previous',
        state : 0
      }),
      Skeletons.Note({
        content   : LOCALE.VALIDATE,
        className : "btn btn--confirm",
        sys_pn    : "commit-button",
        service   : 'commit-translation'
      }),
      Skeletons.Button.Svg({
        ico:"raw-icons_svg_g_1_right", 
        sys_pn : 'next-item',
        className : `${_ui_.fig.family}__icon navigate`,
        name : 'next', 
        service : 'load-item',
        state : 0
      })
    ]});
  let lname = data.name;
  if(LOCALE[lname]) {
    lname = LOCALE[lname]; 
  }
  lname = `${lname} -- ${data.key_code}`;

  const header = Skeletons.Box.X({
    className: `${_ui_.fig.family}__trans-header`,
    kids: [
      Skeletons.Button.Svg({
        ico:"editbox_copy", 
        className : `${_ui_.fig.family}__icon`,
        service   : _e.copy
      }),
      Skeletons.Note({
        className : `${_ui_.fig.family}__trans-name`,
        content   : lname,
        active : 0,
        sys_pn  : "current-lang"
      }),
      Skeletons.Button.Svg({
        ico:"account_cross", 
        className : `${_ui_.fig.family}__icon p-5`,
        service   : _e.close
      })
    ]});

  const languages = Skeletons.Box.X({
    className: `${_ui_.fig.family}__trans-languages`,
    kids : (() => {
      const result = [];
      for (var l of Array.from(Platform.get('intl'))) {
        var state = 0;
        if (l === data.name) { 
          state = 1;
        }
        result.push(Skeletons.Note({
          className : `${_ui_.fig.family}__trans-select`,
          content   : l,
          service   : "select-lang",
          name      : l, 
          state, 
          radiotoggle : _ui_.cid 
        }));
      }
      return result;
    })()
  });

  
  const form = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.family}__form-container`,
    uiHandler : _ui_,
    sys_pn    : "row-form",
    kids :[
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__form-content`,
        kids      : [
          header,
          languages,
          Skeletons.Entry({
            sys_pn       : "form-entry",
            className    : `${_ui_.fig.family}__field`,
            name         : data.name,
            id           : data.id,
            value        : data.value,
            placeholder  : data.name,
            code     : data.key_code,
            type         : _a.textarea
          }),
          //iframe
          bar
        ]})
    ]});
  const a = form;

  return a;
};
module.exports = __locale_row;
