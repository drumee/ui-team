/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/admin/skeleton/update-translations
//   TYPE :
// ==================================================================== *

// ===========================================================
// _form (update-translations)
//
// @param [Object] manager
//
// ===========================================================

const targets = {
  ui: 'locale/',
  server: 'dataset/locale/',
  transfer: 'store/transfer/locale/',
  'electron-main': 'desktop/src/locale/',
  'electron-web': 'src/drumee/widgets/electron/locale/',
  'mimetype': 'dataset/configs/',
  'liceman': 'locale/',
  'sandbox': 'app/locale/',
}
const __locale_acknowledge = function (_ui_, data, message) {
  const header = Skeletons.Box.X({
    className: `${_ui_.fig.family}__trans-header`,
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__trans-name`,
        content: message || "Build succeeded!",
        active: 0
      }),
      Skeletons.Button.Svg({
        ico: "account_cross",
        className: `${_ui_.fig.family}__icon p-5`,
        service: _e.close
      })
    ]
  });
  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__form-container`,
    kids: [header]
  });
  if (!data) return a;
  for (let k in data) {
    _ui_.debug("AAA:50", k, data[k]);
    let dest = targets[k] || '.';
    let src = data[k].replace(/[\/]+$/, '');
    let text;
    if(/.+\.(.+)$/.test(data[k])){
      text = `rsync -av ${src} ${dest}`;;
    }else{
      text = `rsync -av ${src}/ ${dest}`;;
    }

    a.kids.push(Skeletons.Box.X({
      kids: [
        Skeletons.Note({
          content: text,
          className: `${_ui_.fig.family}__ack-item`
        }),
        Skeletons.Button.Svg({
          ico: "editbox_copy",
          text,
          className: `${_ui_.fig.family}__icon build`,
          service: 'copy-build-path'
        })
      ]
    }));
  }
  a.kids.push(Skeletons.Note({
    className: `${_ui_.fig.family}__ack-clipboard`,
    content: "Shell command copied to clipboard !",
    sys_pn: "clipboad-message",
    state: 0
  }));

  return a;
};
module.exports = __locale_acknowledge;
