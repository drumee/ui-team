// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/share-box/skeleton/outbound/public-link';
}

const _public_link = function(manager) {

  const icons_opt = {
    width: 26,
    height: 26,
    padding: 5,
    cursor: "pointer"
  };
  const link = manager.model.get(_a.link);
  const link_delete = {
    kind        : KIND.box,
    className   : 'public-link__icon-item',
    flow        : _a.y,
    kids        : [ 
      SKL_SVG('desktop_delete', {
        service: 'remove-link', 
        value : manager.model.get(_a.nid) 
      }, icons_opt)
    ]
  };

  const link_copy = {
    kind        : KIND.box,
    className   : 'public-link__icon-item',
    flow        : _a.y,
    kids        : [ SKL_SVG('desktop_copy',  { service: 'copy-link' },                   icons_opt) ]
  };

  const public_link_content = {
    kind: KIND.box,
    flow: _a.horizontal,
    className: 'public-link__content',
    sys_pn : "public-link-content",
    kids: [
      link_copy,
      SKL_Note(null, link, { 
        className : 'public-link__href', 
        sys_pn    : "public-link-value"
        }, {  padding: 0 }),
      link_delete
    ]
  };
   
  const a = SKL_Box_H(manager, {
    flow: _a.vertical,
    className : 'public-link__block',
    kids: [
      SKL_Note(_e.share, LOCALE.CREATE_PUBLIC_LINK, {
        className: 'public-link__title'
      }),
      SKL_Box_H(manager, {
        className: 'public-link__type',
        flow: _a.vertical,
        kids: [ 
          public_link_content,        
          SKL_Box_H(manager, {
            className: 'mb-12 public-link__setting-block',
            kidsOpt: {
              className: 'share-popup__modal-options mx-10 option'
            },
            kids: [
              SKL_SVG('desktop__cog', {
                service: 'sharing-privilege',
                signal : _e.ui.event,
                handler: {
                  uiHandler : manager
                },
                radiotoggle: 'quick-options-group'
              }, {
                width: 30,
                height: 30,
                padding: 5
              })
            ]
          }),
          Skeletons.Box.Y({
            sys_pn: 'quick-share-tabs',
            className: 'w-100'
          }),
          Skeletons.Box.YX({
            className: 'public-link__btn',
            flow: _a.horizontal,
            kids: [ 
              SKL_Note("close-public-link", LOCALE.CLOSE, {
                value: manager.model.get(_a.nid), 
                handler : {
                  uiHandler: manager
                },
                className: 'share-popup__modal-btn close'
              })
            ]
          })
        ]        
      })     
    ]
  }); 
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = _public_link;