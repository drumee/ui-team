// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-view-contact
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __modal_view_contact
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================

const __modal_view_contact = function(view, opt) {
  _dbg("iudfiufdiudf", opt.profile);
  const checkbox_options = {
    width: "100%",
    height: 19,
    padding: 0
  };
  // header_icon_options =
  //   height  : 14
  //   width   : 14
  //   padding : 0

  const close_btn_options = {
    width   : 72,
    height  : 72,
    padding : 24  
  };

  // resent_icon_options =
  //   width   : 10
  //   height  : 10
  //   padding : 0

  // approved_icon_options =
  //   width   : 30
  //   height  : 30
  //   padding : 4
  const email = opt.email || "";
  const a = {
    kind    : KIND.box,
    flow    : _a.vertical,
    kidsOpt : {
      mapName : _a.reader,
      signal  : _e.ui.event,
      handler : {
        uiHandler   : view
      }
    },
    className : "popup__inner popup__inner--big",//modal__inner account-modal pt-34 pb-30 px-68 u-ai-center"
    kids    : [
      SKL_SVG("account_cross", {
        signal    : _e.ui.event,
        service   : "close-modal",
        className : "popup__close"
      }, close_btn_options),
     
     
      SKL_Note(null, "Contacts", {className:"contacts__header mb-53 u-jc-center"}),
      // SKL_Note(null, "This is a new contact.", {className:"account-form__header mb-30 u-jc-center"})
      // SKL_Note(null, "Do you want to add it in your contact list?", {className:"account-form__header mb-60 u-jc-center"})


      SKL_Box_V(view, {
        styleOpt: { 
          width: 210
        },
        kids: [
          SKL_Box_V(view, {
            className: "account-form__middle u-jc-sb mb-40",
            kids: [
              SKL_Box_H(view, {
                className: "account-form__input-block",
                kids: [
                  SKL_Entry(view, '',{
                    className   : "account-form__input-mydata",
                    placeholder : "Name",
                    value       : opt.profile.firstname,
                    name        : _a.firstname,
                    styleOpt: { 
                      width: 210
                    }
                  })
                ]
              })
            ]
          }),
          SKL_Box_V(view, {
            className: "account-form__middle u-jc-sb mb-40",
            kids: [
              SKL_Box_H(view, {
                className: "account-form__input-block",
                kids: [
                  SKL_Entry(view, '',{
                    className : "account-form__input-mydata",
                    placeholder: "Surname",
                    name       : _a.lastname,
                    value       : opt.profile.lastname,
                    styleOpt: { 
                      width: 210
                    }
                  })
                ]
              })
            ]
          }),
          SKL_Box_V(view, {
            className: "account-form__middle u-jc-sb mb-40",
            kids: [
              SKL_Box_H(view, {
                className: "account-form__input-block",
                kids: [
                  SKL_Entry(view, '',{
                    className : "account-form__input-mydata",
                    placeholder: "Email",
                    name       : _a.email,
                    value       : opt.profile.email,
                    styleOpt: { 
                      width: 210
                    }
                  })
                ]
              })
            ]
          }),
          SKL_Box_V(view, {
            className: "account-form__middle u-jc-sb mb-40",
            kids: [
              SKL_Box_H(view, {
                className: "account-form__input-block",
                kids: [
                  SKL_Entry(view, '',{
                    className : "account-form__input-mydata",
                    placeholder: "+0 000 00 00 00",
                    value       : opt.profile.mobile,
                    name       : _a.mobile,
                    styleOpt: { 
                      width: 210
                    }
                  })
                ]
              })
            ]
          })
          // SKL_SVG_LABEL("common_placeholder", {
          //   className: "mb-64 account-form__checkbox u-ai-center"
          //   label: "Send invitation to join Drumee"
          //   state: 0 
          // }, checkbox_options)
        ]
      }),
      SKL_Box_H(view, {
        className: "",
        kids: [
          SKL_Note(null, "Close", {
            className: "btn btn--regular",     
            signal: _e.ui.event,
            service: "close-modal"       
          })
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-view-contact'); }  
  return a;
};
module.exports = __modal_view_contact;
