// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/admin/skeleton/locale
//   TYPE : 
// ==================================================================== *

const __category = function(_ui_, name, state){
  return Skeletons.Note({
    content: name,
    category: name,
    className: `${_ui_.fig.family}__selector`,
    radio: _ui_.cid,
    state,
    service: 'change-type'
  });
}

const __languages_list = function (_ui_) {

  const _list = Skeletons.List.Smart({
    className: `${_ui_.fig.family}__roll mb-80 u-ai-center`,
    vendorOpt: Preset.List.Orange_e,
    sys_pn: _a.content,
    uiHandler: [_ui_],
    api: _ui_.listApi.bind(_ui_),
    itemsOpt: {
      kind: 'locale_language',
      uiHandler: [_ui_],
    }
  });

  const search_box = {
    kind: KIND.search,
    flow: _a.x,
    className: `${_ui_.fig.family}__searchbox`,
    listClass: "found-box",
    justify: _a.left,
    uiHandler: [_ui_],
    sys_pn: "ref-searchbox",
    service: "items-found",
    api: _ui_.searchApi.bind(_ui_),
    vendorOpt: {
      placeholder: _ui_.mget(_a.placeholder),
      mode: _a.interactive,
      preselect: 1,
      name: _a.name
    },
  };

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__topbar`,
        kids: [
          Skeletons.Note({
            content: "Drumee Translation table",
            className: `${_ui_.fig.family}__title`
          }),
          Skeletons.Box.X({
            className: `${_ui_.fig.family}__selector-container`,
            kids: [
              __category(_ui_, 'ui', 1),
              __category(_ui_, 'server', 0),
              __category(_ui_, 'transfer', 0),
              __category(_ui_, 'electron-web', 0),
              __category(_ui_, 'electron-main', 0),
              __category(_ui_, 'liceman', 0),
              __category(_ui_, 'sandbox', 0),
            ]
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__header`,
        kids: [
          search_box,
          Skeletons.Note({
            content: "Create/Update",
            service: "new-entry",
            className: "ml-50 content__label add"
          }),
          Skeletons.Note({
            content: "Build",
            service: "build-lex",
            className: "ml-50 content__label generate"
          })
        ]
      }),
      _list,
      Skeletons.Wrapper.X({
        ui: _ui_,
        className: `${_ui_.fig.family}__dialog`
      })
    ]
  });
  return a;
};
module.exports = __languages_list;
