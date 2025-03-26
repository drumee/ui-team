
const { dayOfTime } = require("core/utils")
const __locale_item = function(view, ext) { 
  let updated_at;
  const name = '';
  const pfx = "admin-locale";
  const created_at = dayOfTime(ext.ctime, "DD-MM-YY");
  if (ext.utime != null) {
    updated_at = dayOfTime(ext.utime, "DD-MM-YY");
  } else {
   updated_at = "---";
 }

  const state = view.get(_a.state);

  const menu = Skeletons.Box.X({
    className: `${pfx}__item-header`,
    kids:[
      Skeletons.Note({
        className: `${pfx}__item-key`,
        value: ext.key_code,
        name: "key_code"
      })
    ]
  });
  const content = Skeletons.Box.Y({
    className: `${pfx}__item-container`,
    initialState: 0,
    kids: [
      Skeletons.Note({
        className: `${pfx}__item-lang`,
        value: ext.en,
        name: "en",
        dataset: {
          name: "en"
        }
      }),
      Skeletons.Note({
        className: `${pfx}__item-lang`,
        value: ext.fr,
        name: "fr",
        dataset: {
          name: "fr"
        }
      }),
      Skeletons.Note({
        className: `${pfx}__item-lang`,
        value: ext.ru,
        name: "km",
        dataset: {
          name: "km"
        }
      }),
      Skeletons.Note({
        className: `${pfx}__item-lang`,
        value: ext.ru,
        name: "ru",
        dataset: {
          name: "ru"
        }
      }),
      Skeletons.Note({
        className: `${pfx}__item-lang`,
        value: ext.zh,
        name: "zh",
        dataset: {
          name: "zh"
        }
      })
    ]
  });


  const a = Skeletons.Box.Y({
    className: `${pfx}__item-main`,
    initialState: 0,
    kids:[menu, content]
  });
  return a;
};
module.exports = __locale_item;
