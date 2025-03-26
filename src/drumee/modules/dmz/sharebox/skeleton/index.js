// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/modules/dmz/sharebox/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_sharebox (_ui_) {
  const shareboxFig = _ui_.fig.family

  const header = Skeletons.Box.X({
    className : `${shareboxFig}__header`,
    sys_pn    : _a.header
  })

  const content = Skeletons.Box.X({
    className : `${shareboxFig}__content`,
    sys_pn    : _a.content
  })

  const footer = Skeletons.Wrapper.X({
    className : `${shareboxFig}__footer`,
    sys_pn    : _a.footer,
    dataset   : {
      mode  : _a.closed,
    }
  })

  const footerLink = Skeletons.Note({
    className : `${shareboxFig}__footer-note`,
    href      : `https://drumee.org`,
    target    : '_blank',
    content   : 'Powered by Drumee'
  })

  let a = Skeletons.Box.X({
    className : `${shareboxFig}__main`,
    debug     : __filename,
    kids      : [
      Skeletons.Box.Y({
        className : `${shareboxFig}__container`,
        kids      : [
          header,
          content,
          footer,
          footerLink
        ]
      })
    ]
  });

  return a;

};

export default __skl_dmz_sharebox;
