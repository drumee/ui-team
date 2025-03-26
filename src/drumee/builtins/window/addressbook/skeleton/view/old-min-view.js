// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/addressbook/skeleton/view/min-view
//   TYPE : Skelton
// ==================================================================== *

const __skl_addressbook_view_min_view = function(_ui_) {
  this.debug("__skl_addressbook_view_min_view", _ui_);
  
  const tags = { 
    kind      : "widget_tag",
    className : "widget_tag",
    sys_pn    : "tags",
    viewMode  : _ui_._view
  };
  
  const content = Skeletons.Note({
    content   : "MIN view MIN viewMIN viewMIN viewMIN viewMIN viewMIN view"});

  const view = Skeletons.Box.X({ 
    debug     : __filename,
    className : `${_ui_.fig.family}__min-view ${_ui_.fig.group}__min-view`, 
    sys_pn    : "min-view",
    kids      : [
      require('../common/overlay-wrapper')(_ui_),
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__min-view-content ${_ui_.fig.group}__min-view-content`, 
        sys_pn    : "min-view-content",
        kids      : [
          tags
        ]})
      
    ]});
  
  return view;
};

module.exports = __skl_addressbook_view_min_view;
