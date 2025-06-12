// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/modules/dmz/sharebox/skeleton/footer.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_sharebox_footer (_ui_) {
  const footerFig = `${_ui_.fig.family}-footer`

  const closeIcon = Skeletons.Box.X({
    className : `${footerFig}__close`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'cross',
        className : `${footerFig}__icon close-banner`,
        service   : 'close-banner',
        uiHandler : _ui_
      })
    ]
  })

  const content = Skeletons.Box.Y({
    className : `${footerFig}__wrapper content`,
    kids      : [
      Skeletons.Box.X({
        className : `${footerFig}__header`,
        kids      : [
          Skeletons.Note({
            className : `${footerFig}__note title`,
            content   : LOCALE.DMZ_SHAREBOX_FOOTER_TITLE
          })
        ]
      }),

      Skeletons.Box.X({
        className : `${footerFig}__description`,
        kids      : [
          Skeletons.Note({
            className : `${footerFig}__note description`,
            content   : LOCALE.DMZ_SHAREBOX_FOOTER_CONTENT
          })
        ]
      })
    ]
  })

  const signupButton = Skeletons.Box.X({
    className : `${footerFig}__buttons-wrapper`,
    sys_pn    : 'button-wrapper',
    service   : 'open-signup',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${footerFig}__button-desk`,
        content   : LOCALE.SIGNUP_FOR_FREE
      })
    ]
  })

  const websiteLink = Skeletons.Box.X({
    className : `${footerFig}__website-link-wrapper`,
    kids      : [
      Skeletons.Note({
        className : `${footerFig}__note website label`,
        content   : LOCALE.DMZ_MORE_ON
      }),

      Skeletons.Box.X({
        className  : `${footerFig}__website-link`,
        href      : `${protocol}://${Host.get('main_domain')}`,
        attrOpt :{
          target    : '_blank',
        },
        kids: [
          Skeletons.Note({
            className : `${footerFig}__note website link text-underline`,
            content   : 'drumee.com'
          })
        ]
      })
    ]
  })

  const buttonsWrapper = Skeletons.Box.Y({
    className : `${footerFig}__wrapper button`,
    kids      : [
      signupButton,
      websiteLink
    ]
  })

  const deskImage = Skeletons.Element({
    className : `${footerFig}__banner-desk image`,
    tagName : _K.tag.img,
    attrOpt : {
      src : '/-/images/dmz/footer-banner-desk.png',
      alt : 'Drumee'
    }
  })

  const container = Skeletons.Box.X({
    debug     : __filename,
    className : `${footerFig}__container`,
    kids      : [
      content,
      buttonsWrapper,
      deskImage,
      closeIcon
    ]
  });

  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${footerFig}__main`,
    kids      : [
      container
    ]
  });
  
  return a;

};

export default __skl_dmz_sharebox_footer;
