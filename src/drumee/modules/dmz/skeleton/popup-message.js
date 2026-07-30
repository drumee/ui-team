// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/skeleton/popup-message.js
//   TYPE : Skeleton
// ==================================================================== *
//
//   Status card for the share landing page (link revoked / expired /
//   invalid / email already registered / email not allowed / error).
//   Rendered by Dmz.say() into the dmz-router wrapper-modal.
//
//   The card is restyled in popup.scss to match the other secure-share
//   popups (sharebox request-sent / request-access / signup-required);
//   the STRUCTURE here is deliberately unchanged so the restyle cannot
//   regress the markup.
//
//   The default btnService is 'close-popup' (__dmz_router.onUiEvent clears
//   the wrapper). Callers no longer pass 'redirect-to-home': in THIS module
//   that case never redirected — it opened a mailto: composer — so the "OK"
//   button popped the visitor's mail client. Dropped 2026-07-30.
//
// ==================================================================== *

function __skl_dmz_popup_message (_ui_, opt) {

  const popupFig = `${_ui_.fig.family}-popup`

  let btnService = opt.btnService || 'close-popup';
  let btnLabel = opt.btnLabel || LOCALE.OK

  // Two of these locale strings carry a trailing space (LINK_EXPIRES,
  // EMAIL_EXIST_SIGN_CONTINUE). A trailing space is not collapsed when the
  // text fits on one centered line, so it shifts the sentence off-centre by
  // half a space. Trim strings only — a caller may pass a skeleton node.
  const content = _.isString(opt.content) ? opt.content.trim() : opt.content;

  const a = Skeletons.Box.Y({
    className : `${popupFig}__container u-jc-center u-ai-center`,
    debug     : __filename, 
    kids: [
      // Brand lockup, opt-in via opt.logo — set ONLY by the revoked status, so
      // every other status keeps the card exactly as it is. raw-logo-drumee-full
      // is the mark AND the "drumee" wordmark in ONE sprite (viewBox 160x40), so
      // the name needs no text node and no new asset. Its paths carry the
      // #433CC5 brand purple themselves, and the symbol is
      // preserveAspectRatio="xMidYMid meet" so it scales to the card without
      // ever distorting. A null kid is dropped by ui-core's validChild.
      opt.logo ? Skeletons.Image.Svg({
        ico       : 'raw-logo-drumee-full',
        className : `${popupFig}__logo`
      }) : null,

      Skeletons.Note({
        className : `${popupFig}__message`,
        content
      }),

      Skeletons.Box.X({
        className : `${popupFig}__footer u-jc-center u-ai-center overflow-text go`,
        kids:[
          Skeletons.Note({
            className : `${popupFig}__button u-jc-center u-ai-center overflow-text go`,
            content   : btnLabel,
            flow      : _a.y,
            service   : btnService,
            uiHandler : [_ui_]
          })
       ]
      })
    ]
  });

  return a;
};

export default __skl_dmz_popup_message;
