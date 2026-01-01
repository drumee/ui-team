/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/pages/admin-settings/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

import ___admin_security_page from "..";

/**
 * @param { ___admin_security_page }  _ui_
 * @param {string} name
 * @param {string} label
 * @param {string} value
 * @param {boolean} state
 */
function addItemOptions(_ui_, name, label, value, state) {
  let option = Skeletons.Box.X({
    className: `${_ui_.fig.family}__option-item`,
    radio: name,
    formItem: name,
    value: value,
    state: state,
    service: 'change-option_parrent',
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__classname`,
        service: 'change-option',
        kidsOpt: {
          active: 0
        },
        kids: [
          Skeletons.Button.Svg({
            className: `${_ui_.fig.family}__icon checkbox`,
            ico: "account_check",
            //label: label
            value: '1',
            uiHandler: _ui_,
          }),
          Skeletons.Note({
            className: `${_ui_.fig.family}__option-label`,
            content: label
          })
        ]
      })
    ]
  })
  return option;
}

/**
 * @param {___admin_security_page} _ui_
 */
function __skl_admin_security_visibility(_ui_) {
  let org = _ui_.organisation;
  const directoryBox = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__box-set`,
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__box-header`,
        content: LOCALE.MEMBERS_SEEN_IN_DIRECTORY //"Members seen in directory"
      }),
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__option-wrapper`,
        formItem: 'dir_visibility',
        dataType: _a.object,
        kids: [
          addItemOptions(_ui_, "dir_visibility", LOCALE.ALL_MEMBERS, 'all', (org.dir_visibility == 'all')),
          //"All members"
          addItemOptions(_ui_, "dir_visibility", LOCALE.NOBODY, 'none', (org.dir_visibility == 'none')),
          //"Nobody"
        ]
      })
    ]
  });
  const infoMemberBox = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__box-set`,
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__box-header`,
        content: LOCALE.INFORMATIONS_SEEN //"Members information's seen"
      }),
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__option-wrapper`,
        formItem: 'dir_info',
        dataType: _a.object,
        kids: [
          addItemOptions(_ui_, "dir_info", LOCALE.ONLY_NAME, 'name', (org.dir_info == 'name')),
          //"Only name"
          addItemOptions(_ui_, "dir_info", LOCALE.ALL_MEMBERS_INFORMATIONS, 'all', (org.dir_info == 'all')),
          //"All members information's"
        ]
      })
    ]
  });
  let a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__block_wrapper`,
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__block_title`,
        content: LOCALE.DIRECTORY_VISIBILITY_RULES //"Géneral visibility in company directory"
      }),
      directoryBox,
      infoMemberBox
    ]
  })
  return a;
}
export default __skl_admin_security_visibility;