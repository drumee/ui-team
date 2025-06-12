// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/signup/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __welcome_default = function(_ui_) {

  const link = `<a href='https://drumee.com/engegements-protection-vie-privee/' target='_blank'>${LOCALE.CONFIDENTIAL}</a>`;

  const l3 = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__title-container`,
    kids      : [
      Skeletons.Note({
        className : `${_ui_.fig.family}__title-header`,
        content   : LOCALE.CONGRATULATIONS
      }),
      
      Skeletons.Note({
        className: `${_ui_.fig.family}__title`,
        content: LOCALE.TRY_DRUMEE.format(link)
      })
    ]});
  

  const __l4 =  Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__entry-container`,
    sys_pn : "entry-container",
    kids : [
      Skeletons.Button.Svg({
        ico        : 'email',
        src        : `${protocol}://${bootstrap().main_domain}/_/static/images/icons/email.svg`, 
        className  : "icon ctrl-email",
        service    : _e.close,
        uiHandler  : _ui_
      }),

      Skeletons.Entry({
        className    : `${_ui_.fig.family}__entry email`,
        service      : "signup",
        placeholder  : LOCALE.EMAIL,
        require      : _a.email,
        mode         : _a.commit,
        sys_pn       : "ref-email",
        interactive  : 1,
        preselect    : 1,
        uiHandler    : [_ui_]}),

      Skeletons.Box.Y({
        sys_pn      : "wrapper-button",
        className   : `${_ui_.fig.family}__container-button`,
        kids : [ require('./go')(_ui_) ]})
    ]});

  const l4 = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__row`,
    sys_pn      : "ref-input-row",
    kids : [ __l4 ]});


  const l5 = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__row ${_ui_.fig.group}__error-wrapper`,
    sys_pn    : "wrapper-error",
    state     : 0,
    kids:[
      Skeletons.Note({
        className : `${_ui_.fig.group}__error-message`,
        sys_pn    : "error-message",
        content   : "",
        state     : 0
      })
    ]});
  
  const url = _K.confidentialURL + location.search;
  const href = `${protocol}://${bootstrap().main_domain}${location.pathname}${_K.module.signin}`;
  const l6 = Skeletons.Box.X({
    className : `${_ui_.fig.family}__footer-container`,
    sys_pn    : 'signin-wrapper',
    kids      : [
      Skeletons.Note({
        className : `${_ui_.fig.family}__footer`,
        content   : LOCALE.ALREADY_HAVE_ACCOUNT
      }),
      
      Skeletons.Note({
        className : `${_ui_.fig.family}__login-btn`,
        content   : LOCALE.LOGIN,
        href,
        service   : _e.close,
        onclose   : href
      })
    ]});

  const l7 = { sys_pn: 'websocket', kind: KIND.ws_channel };

  const a = Skeletons.Box.Y({
    debug : __filename,  
    className : `${_ui_.fig.family}__main`,
    kids:[l3, l4, l5, l6, l7]});

  return a;
};
module.exports = __welcome_default;
