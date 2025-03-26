// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
//
// @return [Object] 
//
// ===========================================================
const __invitation_searchbox_main = function (_ui_) {
  const size = _ui_.size || {};
  const search_box = {
    kind: KIND.search,
    flow: _a.x,
    className: `${_ui_.fig.family}__input--inline`,
    placeholder: _ui_.mget(_a.placeholder) || LOCALE.CNAME,
    listClass: "found-box",
    justify: _a.left,
    sys_pn: "ref-searchbox",
    uiHandler: [_ui_],
    partHandler:[_ui_],
    api: _ui_.getApi(),
    mode: _a.interactive,
    service: "items-found",
    vendorOpt: {
      mode: _a.interactive,
      preselect: _ui_.mget(_a.preselect) || 0,
      name: "key"
    }
  };
  if (_ui_.mget(_a.preselect) === 0) {
    delete search_box.vendorOpt.preselect;
  }

  let show_all = Skeletons.Button.Svg({
    service: "show-all",
    uiHandler: _ui_,
    ico: "desktop_contactbook",
    sys_pn: "ctrl-show-all",
    state: 0,
    icons: [
      'desktop_contactbook',
      'desktop_plus'
    ],
    className: `${_ui_.fig.family}__icon ${_ui_.fig.group}__icon`
  });

  if (!_ui_.mget('contactbook')) {
    show_all = { kind: KIND.wrapper };
  }

  const a = [
    Skeletons.Box.Y({
      className: `${_ui_.fig.family}__main ${_ui_.fig.name}__main`,
      kids: [
        Skeletons.Box.X({
          kids: [search_box, show_all]
        })
      ]
    }),
    Skeletons.Wrapper.Y({
      name: "tooltips",
      part: _ui_,
      className: `${_ui_.fig.family}__tooltips`
    }),
    require("./results")(_ui_)
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __invitation_searchbox_main;
