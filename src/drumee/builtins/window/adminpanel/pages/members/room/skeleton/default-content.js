// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/room/skeleton/default-content.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_members_room_default_content (_ui_) {
  const contentFig = _ui_.fig.family

  let gotToText;

  if (_ui_._currentTag && (_ui_._currentTag.mget(_a.type) == _a.tag)) {
    gotToText = Skeletons.Note({
      className : `${contentFig}__note default-content goto-text`,
      content   : LOCALE.GO_TO_ALL_MEMBERS.format(LOCALE.ALL_MEMBERS)
    });
  }

  const clickText = Skeletons.Note({
    className : `${contentFig}__note default-content click-text`,
    content   : LOCALE.CLICK_ICON
  });

  const addContact_text = Skeletons.Note({
    className : `${contentFig}__note default-content add-members-text`,
    content   : LOCALE.TO_ADD_MEMBERS
  });

  const menuIcon  = Skeletons.Button.Svg({
    ico       : 'drumee-contact_add',
    className : `${contentFig}__icon add-member`
  });

  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${contentFig}__default-content`,
    sys_pn    : 'default-content',
    kids      : [
      Skeletons.Box.Y({
        className : `${contentFig}__wrapper default-content`,
        kids      : [
          gotToText,

          Skeletons.Box.X({
            className : `${contentFig}__wrapper default-content content2`,
            kids      : [
              clickText,
              menuIcon,
              addContact_text
            ]
          })
        ]
      })
    ]
  });
  
  return a;
};

export default __skl_members_room_default_content;
