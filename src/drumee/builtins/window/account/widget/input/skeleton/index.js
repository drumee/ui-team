/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/builtins/window/account/widget/input/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const __skl_widget_account_input = function (_ui_) {
  let actionItem, identifier;
  const accInputFig = _ui_.fig.family;

  const data = _ui_.model.toJSON();
  data.value = data.value || '';
  if (_ui_.mget(_a.icon)) {
    identifier = Skeletons.Box.X({
      className: `${accInputFig}__icon-container`,
      kids: [
        Skeletons.Button.Svg({
          ico: _ui_.mget(_a.icon),
          className: `${accInputFig}__icon-picto`,
          uiHandler: _ui_
        })
      ]
    });
  }

  if (_ui_.mget(_a.label)) {
    identifier = Skeletons.Box.X({
      className: `${accInputFig}__label-container`,
      kids: [
        Skeletons.Note({
          className: `${accInputFig}__label-text`,
          sys_pn: 'ref-label',
          content: _ui_.mget(_a.label),
          uiHandler: _ui_
        })
      ]
    });
  }

  let content = Skeletons.Box.X({
    className: `${accInputFig}__content-wrapper`,
    sys_pn: 'wrapper-content',
    kids: [
      Skeletons.Note({
        className: `${accInputFig}__note editable`,
        content: data.value
      })
    ]
  });

  if (_ui_.mget(_a.name) === _a.address) {
    const addrsVal = data.value || { street: '', city: '', country: '' };
    content = Skeletons.Box.X({
      className: `${accInputFig}__content-wrapper address`,
      sys_pn: 'wrapper-content',
      kids: [
        Skeletons.Box.Y({
          className: `${accInputFig}__address-wrapper`,
          kids: [
            Skeletons.Note({
              className: `${accInputFig}__note address details street`,
              content: addrsVal.street || 'N/A'
            }),

            Skeletons.Note({
              className: `${accInputFig}__note details address city`,
              content: addrsVal.city
            }),

            Skeletons.Note({
              className: `${accInputFig}__note details address country`,
              content: addrsVal.country
            })
          ]
        })
      ]
    });
  }

  if (_ui_.mget(_a.locked) != null) {
    actionItem = Skeletons.Box.X({
      className: `${accInputFig}__options-wrapper go-to-security action-item`,
      kids: [
        Skeletons.Button.Svg({
          ico: 'editbox_pencil',
          className: `${accInputFig}__icon edit-icon`,
          href: "#/desk/account/security"
        })
        // Skeletons.Note({
        //   className: `${accInputFig}__note navigation`,
        //   content: LOCALE.GO_TO_SECURITY_TAB,//'Go to security Tab'
        //   href: "#/desk/account/security"
        // })
      ]
    });
  }

  if (_ui_.mget('editable') != null) {
    actionItem = Skeletons.Box.X({
      className: `${accInputFig}__options-wrapper edit-icon action-item`,
      kids: [
        Skeletons.Button.Svg({
          ico: 'editbox_pencil',
          className: `${accInputFig}__icon edit-icon`,
          service: _e.edit,
          type: data.name
        })
      ]
    });
  }


  const a = Skeletons.Box.X({
    className: `${accInputFig}__main`,
    debug: __filename,
    sys_pn: 'wrapper-row',
    kids: [
      Skeletons.Box.X({
        className: `${accInputFig}__container static-mode`,
        sys_pn: 'wrapper-container',
        kids: [
          identifier,
          content,
          actionItem
        ]
      })
    ]
  });

  return a;
};

module.exports = __skl_widget_account_input;
