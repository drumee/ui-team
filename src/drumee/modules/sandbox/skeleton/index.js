const { toggleState } = require("core/utils")
const _button = function (label, service, name, cn) {
  const urlSeparator = new RegExp(/[\/&\?]/g);
  const opt = location.hash.split(urlSeparator);
  opt.shift();
  const _name = opt[1] || 'text';
  const a = Skeletons.Note({
    content: label,
    service,
    name,
    initialState: toggleState(name === _name)
  });
  if (name != null) {
    a.href = `#/sandbox/${name}`; //name
  }

  if (cn != null) {
    a.className = cn;
  }
  if (service !== 'run') {
    a.radio = "buttons-sdb";
  }
  return a;
};

const _header = function (_ui_) {
  let title = Skeletons.Note({
    className: `${_ui_.fig.name}-title`,
    content: `LETC, sounds like Let's See, stands for Limitlessly Extensible Traversal Collection`,
  })
  let tooltips = Skeletons.Note({
    className: `${_ui_.fig.name}-tooltips`,
    content: `?`,
    service: 'show-tooltips'
  })
  return [title, tooltips]
}
const __sandbox_main = function (_ui_) {

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.name}-wrapper`,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.name}-header`,
        kids: _header(_ui_)
      }),
      Skeletons.Box.G({
        className: `${_ui_.fig.name}-display`,
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.name}-console`,
            sys_pn: "console",
          }),
          Skeletons.Note({
            className: `${_ui_.fig.name}-intro`,
            sys_pn: "intro",
          }),
        ]
      }),
      Skeletons.Box.G({
        className: `${_ui_.fig.name}-body`,
        kids: [
          Skeletons.Box.Y({
            sys_pn: "nav",
            className: `${_ui_.fig.name}-nav`,
            kidsOpt: {
              className: "buttons",
            },
            kids: [
              _button("01. Simple text", "load", "text"),
              _button("02. Some charts", "load", "charts"),
              _button("03. Some buttons", "load", "buttons"),
              _button("04. SVG engine", "load", "svg"),
              //_button("04. More funny things", "load", "jumper")  
              //_button("05. Prebuilt content", "load", "prebuilt")  
              _button("05. Dynamic list", "load", "list"),
              _button("06. Menu", "load", "menu"),
              _button("07. Radio buttons", "load", "radio"),
              _button("08. Forms", "load", "form"),
              _button("09. Countdown", "load", "countdown"),
              _button("10. Table", "load", "table"),
              //_button("12. Try your own?", "load", "trial")  
              //_button("12. Example with Github?", "load", "github")  
              //_button("Kinds", "load", "kinds", "buttons kinds")  
              _button("Run", "run", null, "buttons run")
            ]
          }),
          Skeletons.Box.Y({
            className: `${_ui_.fig.name}-editor`,
            sys_pn: "editor"
          }),
          Skeletons.Box.Y({
            className: `${_ui_.fig.name}-viewer`,
            sys_pn: "preview",
          })
        ]
      })
    ]
  });
  return a;
};
module.exports = __sandbox_main;
