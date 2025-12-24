
/// <reference path="../../../../../../../../../@types/index.d.ts" />
const { button } = require("builtins/skeleton/toolkit");

function __skl_import_members_page(ui) {
  const fig = ui.fig.family;
  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: _e.close,
        state: 1,
        priority: "secondary",
      }),
      button(ui, {
        label: LOCALE.CREATE_ACCOUNTS,
        type: _a.toggle,
        sys_pn: 'button-validate',
        state: 0,
        ico: "arrow-right",
        service: "create-prepared-counts",
        className: `${fig}__button`,
        priority: "primary",
      })
    ],
  });

  return Skeletons.Box.Y({
    className: `${fig}__members_upload_wrapper`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__members_upload-close-wrapper`,
        kids: [
          Skeletons.Button.Svg({
            ico: 'account_cross',
            className: `${fig}__icon close account_cross`,
            service: 'close-overlay',
            uiHandler: ui
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${fig}__members_upload-title-wrapper`,
        kids: [
          Skeletons.Note({
            className: `${fig} title`,
            content: LOCALE.IMPORT_MEMBERS_LIST //"Import member list"
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${fig}__members_upload-body-wrapper`,
        sys_pn: 'upload-body-wrapper',
        kids: [
          require('./drag-a-drop').default(ui)
        ]
      }),
      Skeletons.Note({
        className: `${fig}__import-list-error-msg`,
        sys_pn: 'import-list-error-msg',
        content: LOCALE.OOOPS_SOME_DATA_PROBLEM_OCCURES,
        dataset: {
          state: _a.closed
        }
      }),
      Skeletons.Box.X({
        className: `${fig}__members_upload-footer-wrapper`,
        sys_pn: 'upload-footer-wrapper',
        kids: [
          buttons
        ]
      })
    ]
  })

}

export default __skl_import_members_page;