const _button = function(label, service, name, cn) {
    const urlSeparator = new RegExp(/[\/&\?]/g);
  const opt = location.hash.split(urlSeparator);
  opt.shift();
  const _name = opt[1] || 'text';
  const a = {
    kind    : KIND.note,
    content : label,
    service,
    name,
    initialState : toggleState(name === _name)
  };
  if (name != null) {
    a.href  = `#/sandbox/${name}`; //name
  }

  if (cn != null) {
    a.className= cn;
  }
  if (service !== 'run') {
    a.radio = "buttons-sdb";
  }
  return a; 
};

// ===========================================================
// __skl_index
//
// @param [Object] _ui_
//
// @return [Object]
//
// ===========================================================
const __skl_index = function(_ui_) {

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    kids : [
      Skeletons.Box.X({
        sys_pn    : "header",
        className : `${_ui_.fig.family}__header`,
        kids : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__title`,
            content : "Drumee API tests panel"
          })
        ]
      }),
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__body`,
        kids : [
          Skeletons.Box.X({
            className : `${_ui_.fig.family}__service-container`,
            kids : [
              Skeletons.Note({
                sys_pn : "service-title",
                className : `${_ui_.fig.family}__service title`,
                content : "Running service: ",
                dataset : {
                  state : 0
                }
              }),
              Skeletons.Note({
                sys_pn : "service-name",
                className : `${_ui_.fig.family}__service running`,
                content : ""
              }),
              Skeletons.Note({
                className : `${_ui_.fig.family}__service-options`,
                sys_pn : "service-options",
                content : ""
              })
            ]
          }),
          Skeletons.Box.Y({
            className : `${_ui_.fig.family}__console`,
            kids : [Skeletons.List.Smart({
              className : `${_ui_.fig.family}__results`,
              sys_pn    : 'results'
            })]
          }),
          Skeletons.Box.X({
            className : `${_ui_.fig.family}__command`,
            kids : [
              Skeletons.Note({
                className : `${_ui_.fig.family}__button`,
                content : "Start Testing",
                service : _e.start 
              }),
              Skeletons.Note({
                className : `${_ui_.fig.family}__button`,
                content : "Test Graph",
                service : "graph"
              })
            ]
          })
        ]
      })
    ]
  });
  //if __BUILD__ is 'dev' then DBG_PATH(a, 'src/drumee/builtins/sandbox/skeleton/main')
  return a;
};
module.exports = __skl_index;
