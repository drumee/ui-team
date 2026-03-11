// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : builins/window/addressbook/skeleton/common/menu
//   TYPE : Skeleton
// ==================================================================== *

const __skl_document_topbar_common_menu = function (_ui_) {
  let download, downloadPDF;
  const menuFig = `${_ui_.fig.family}-menu`;
  const cnWidowMenuBtn = "window-menu";

  const menuTrigger = Skeletons.Box.X({
    className: `${cnWidowMenuBtn}__button-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: "download",
        className: `${cnWidowMenuBtn}__icon`,
      }),
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: _ui_,
        partHandler: _ui_,
        content: "Download",
      }),
    ],
  });

  download = Skeletons.Box.X({
    className: `${menuFig}__item`,
    kids: [
      Skeletons.Button.Svg({
        ico: "download",
        className: `${menuFig}__icon`,
      }),

      Skeletons.Note({
        className: `${menuFig}__name `,
        content: "Download the original file",
      }),
    ],
  });
  downloadPDF = Skeletons.Box.X({
    className: `${menuFig}__item`,
    uiHandler: _ui_,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico: "file-pdf",
        className: `${menuFig}__icon`,
      }),

      Skeletons.Note({
        className: `${menuFig}__name`,
        content: "Download a PDF version",
      }),
    ],
  });

  const edit = Skeletons.Box.X({
    className: `${menuFig}__item`,
    kids: [
      Skeletons.Button.Svg({
        ico: "desktop_edit",
        className: `${menuFig}__icon   `,
      }),

      Skeletons.Note({
        className: `${menuFig}__name `,
        content: "Edit",
      }),
    ],
  });

  const separator = Skeletons.Box.X({
    className: `${menuFig}__separator`,
  });

  const menuItems = Skeletons.Box.X({
    className: `${menuFig}__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${menuFig}__items`,
        kids: [download, downloadPDF, separator, edit],
      }),
    ],
  });

  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids: [
      {
        kind: KIND.menu.topic,
        className: `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
        flow: _a.y,
        opening: _e.click,
        sys_pn: "contact-dropdown",
        service: "contact-menu",
        persistence: _a.none,
        trigger: menuTrigger,
        items: menuItems,
      },
    ],
  });

  return menu;
};

module.exports = __skl_document_topbar_common_menu;
