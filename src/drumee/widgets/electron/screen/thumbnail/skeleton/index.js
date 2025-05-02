// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/widgets/electron/screen/item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_screen_item = function(_ui_) {
  let img;
  const url = _ui_.mget(_a.url) || '';
  if (url.replace(/^data:.+base64,/,'').length) {
    img = Skeletons.Image.Smart({
      className:`${_ui_.fig.family}__image`,
      src: _ui_.mget(_a.url)
    });
    
  } else { 
    img = Skeletons.Button.Svg({
      ico: 'screen_share',
      className: `${_ui_.fig.family}__icon`,
      innerClass:'helper',
    });
  }
    
  const a = Skeletons.Box.G({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      img,
      Skeletons.Note({
        className:`${_ui_.fig.family}__name`,
        content  : _ui_.mget(_a.name)
      })
    ]});

  return a;
};
module.exports = __skl_screen_item;

