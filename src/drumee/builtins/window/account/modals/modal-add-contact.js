/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-add-contact
//   TYPE : 
// ==================================================================== *

// ======================================================
// _temp_dropdown 
// ======================================================
const _temp_dropdown = function(manager){
  let res;
  const radio =
    {'data-radio' : _a.on};
  return res = {
    kind      : KIND.box,
    className : "account-form__dropdown-list py-10",
    flow      : _a.vertical,
    kidsOpt: {
      mapName : _a.reader,
      radio   : _a.on,
      // handler    :
      //   uiHandler    : manager
      // api  :
      //   service : SERVICE.util.get_countries
    
      handler    : {
        uiHandler    : manager
    },
      itemsOpt : _country,
      itemsMap  : { 
        name_en : _a.content
    },
      api  : {
        service : SERVICE.util.get_countries
    }
  }
};
};

var _country = function(list, item){
  const content = item.name || item.locale_en;
  const svg_options = {
    width   : 24,
    height  : 24,
    padding : 8
};

  if (Env.get(_a.lang) === item.locale) {
    const radio_st = 1;

    return SKL_Box_H(list, {
        className: "change-language__item pr-30",
        state: radio_st,
        kidsOpt : {
            handler : list.model.get(_a.handler)
        },
        kids: [
            SKL_Note("change_languages", content, {                                       
            value: item.locale,
            className  : "change-language__name"
            })
        ]
    });
}
};
// ======================================================
// Account - Add contact
// ======================================================
const _account_data_add_contacts = function(manager, ext) {
    const email = ext.searchedMail;
    const img_icon_options = {
        width   : 18,
        height  : 18,
        padding : 0
    };

    const edit_icon_options = { 
        width   : 16,
        height  : 16,
        padding : 0
    };
    const close_btn_options = {
        width   : 42,
        height  : 42,
        padding : 17  
    };

    const a = { 
        kind: KIND.form,
        flow: _a.vertical,
        api       : _a.local,
        className : "modal__inner account-form mt-67 w-100 u-jc-center u-ai-center",
        signal    : _e.ui.event,
        service   : 'add-contacts-list',
        handler   : {
            uiHandler : manager
        },
        name      : 'myContacts',
        kids: [
            SKL_Box_H(manager, {
            kids: [
                SKL_SVG("cross", {
                    className : "modal__close",
                    service   : _e.cancel
                }, close_btn_options),
                SKL_Box_H(manager, {
                className: "account-form__img mr-69",
                kids: [
                  {kind : KIND.profile, styleOpt:{width:123}},
                  SKL_SVG("backoffice_penfill", {
                    className : "account-form__img-icon"    
                  }, img_icon_options)
                ]
                })
            ]
            }),
            SKL_Box_V(manager, {
                styleOpt: { 
                  width: 362
              },
                kids: [
                    SKL_Box_V(manager, {
                    className: "account-form__top u-jc-sb mb-35",
                    kids: [
                        SKL_Box_H(manager, {
                        className: "u-jc-sb",
                        kids: [
                            SKL_Entry(manager, '',{
                                className : "account-form__input",
                                placeholder: LOCALE.FIRSTNAME,
                                name       : _a.firstname,
                                require    : _a.name,
                                styleOpt: { 
                                    width: 174
                                }
                            }),
                            SKL_Entry(manager, '',{
                                className : "account-form__input",
                                placeholder: LOCALE.LASTNAME,
                                name       : _a.lastname,
                                require    : _a.name,
                                styleOpt: { 
                                    width: 174
                                }
                            })
                        ]
                        }),
                        SKL_Box_H(manager, {
                        className: "account-form__input-block",
                        kids: [
                            SKL_Entry(manager, '',{
                                className : "account-form__input pr-45",
                                placeholder: LOCALE.EMAIL, 
                                name       : _a.email,
                                value      : email,
                                inputOpt   : {
                                    disabled : _a.true
                                },
                                styleOpt: { 
                                    width: 362
                                }
                            }),
                            SKL_SVG("backoffice_penfill", {
                                className : "account-form__input-icon"
                            }, edit_icon_options)
                        ]
                        })
                    ]
                    }),
                    SKL_Box_V(manager, {
                    className: "account-form__middle u-jc-sb mb-50",
                    kids: [
                        SKL_Box_H(manager, {
                        className: "account-form__input-block",
                        kids: [
                            SKL_Entry(manager, '',{
                                className : "account-form__input pr-45",
                                placeholder: "Mobile phone number",
                                name       : _a.mobile,
                                styleOpt: { 
                                    width: 362
                                }
                            }),
                            SKL_SVG("backoffice_penfill", {
                                className : "account-form__input-icon"
                            }, edit_icon_options)
                        ]
                        }),
                        SKL_Box_H(manager, {
                        kids: [
                            SKL_Entry(manager, '',{
                                className : "account-form__input",
                                placeholder: "Address",
                                name       : _a.address,
                                styleOpt: { 
                                    width: 362
                                }
                            }),
                            SKL_SVG("backoffice_penfill", {
                                className : "account-form__input-icon"    
                            }, edit_icon_options)
                        ]
                        }),
                        SKL_Box_H(manager, {
                        className: "u-jc-sb",
                        kids    :[
                            SKL_Menu_V(manager, {
                                trigger   : SKL_Note(null, "Country", {className : ""}),
                                flow      : _a.vertical,
                                name      : 'country',
                                items     : _temp_dropdown(manager),
                                className : 'account-form__dropdown u-jc-center ',
                                styleOpt: { 
                                    width: 132
                                }
                            }),
                            SKL_Menu_V(manager, {
                                trigger   : SKL_Note(null, "City", {className : ""}),
                                flow      : _a.vertical,
                                name      : 'city',
                                items     : _temp_dropdown(manager),
                                className : 'account-form__dropdown u-jc-center',
                                styleOpt: { 
                                    width: 109
                                }
                            })
                        ]
                        })
                    ]
                    })
                ]
            }),
            SKL_Box_H(manager, {
                styleOpt: { 
                  width: 362
              },
                kids: [
                  SKL_SVG_LABEL(null, {
                    kind:KIND.button.icon,
                    name : "sendInvitation", 
                    bubble:1,
                    state : 0,
                    iconPosition : _a.left,
                    icons:['editbox_list-squareno', 'backoffice_checkboxfill'],
                    label:"Send invitation to join drumee",
                    styleOpt: {
                        width:80,
                        height:80
                    }
                  })
                ]
            }),
            SKL_Box_H(manager, {
                className: "account-form__bottom u-jc-center mb-50 w-100",
                kids: [
                    SKL_Note(null, "Cancel", {
                        className:"account-form__btn account-form__btn--primary u-ai-center u-jc-center",
                        service : _e.cancel
                    }),
                    SKL_Note(null, "Add Contact", {
                        className:"account-form__btn account-form__btn--primary u-ai-center u-jc-center",
                        service : _e.submit
                    })
                ]
            })
        ]
    };

    if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-add-contact'); }
    return a;
};
module.exports = _account_data_add_contacts;