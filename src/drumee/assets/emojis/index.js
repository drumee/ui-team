/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/assets/emojis.coffee
//   TYPE : Skeleton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const _codes = function (_ui_) {

  let cn = 'edit-button edit-spec-chars';
  if (_ui_.fig != null) {
    cn = _ui_.fig.family + '__emojis-item';
  }
  const codes = [
    require('./smileys')(_ui_),
    require('./gestures')(_ui_),
    require('./objects')(_ui_),
    //require('./flags')(_ui_),
    require('./foods')(_ui_),
    require('./animals')(_ui_),
    //require('./sports')(_ui_),
    //require('./symbols')(_ui_),
    require('./places')(_ui_),
  ]
  let items = [];
  for (var line of codes) {
    let i = 0;
    let a = [];
    for (i = 0; i++; i < line.length) {
      a.push(line[i]);
    }

    let content = '';
    for (var item of line) {
      content = `${content}<span data-service="emoji">${item}</span>`;
    }
    items.push(Skeletons.Element({
      className: cn,
      flow: _a.none,
      content,
      service: _a.insert,
      name: _a.emojis,
      uiHandler: [_ui_]
    }));
  }
  return items;
};

// ===========================

// ===========================================================
// __emojis
//
// @param [Object] _ui_
//
// @return [Object] 
//
// ===========================================================
const __emojis = function (_ui_) {

  // height = 129
  let cn = '';
  if (_ui_.fig != null) {
    cn = _ui_.fig.family;
  }
  const list = Skeletons.List.Smart({
    className: `${cn}__emojis-roll special-specs__wrapper`,
    innerClass: 'box',
    flow: _a.wrap,
    kids: _codes(_ui_),
    vendorOpt: {
      alwaysVisible: true,
      color: '#FA8540',
      distance: '2px',
      opacity: '1',
      size: '2px'
    }
  });

  let recentEmojis = null;
  let items = [];
  try{
    items = JSON.parse(localStorage.recentEmojis);
  }catch(e){
    items = [];
  }
  let content = '';
  if (items.length) {
    for (var item of items) {
      content = `${content}<span data-service="emoji">${item}</span>`;
    }
    recentEmojis = Skeletons.Element({
      flow: _a.x,
      className: `${cn}__emojis-latest`,
      sys_pn: 'recent-emojis',
      content,
    })
  }

  const skl = Skeletons.Box.Y({
    debug: __filename,
    className: _a.toolbox + ` ${cn}__container-emojis`,
    kids: [
      list
    ]
  });
  if(recentEmojis) skl.kids.unshift(recentEmojis);
  return skl;
};

module.exports = __emojis;
