/* ==================================================================== *
* Widget skeleton automatically generated on 2025-03-05T03:29:33.857Z
* npm run add-widget -- --fig=<grpup.family> --dest=/path/to/the/widget
* ==================================================================== */
const emojiFlags = require('emoji-flags');

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
function entry(ui) {
  let { value, name, placeholder } = ui.model.toJSON();
  const pfx = `${ui.fig.family}__entry`;
  let args = {
    className: `${pfx} entry`,
    name,
    value,
    formItem: name,
    innerClass: name,
    mode: _a.interactive,
    service: _a.input,
    placeholder,
    uiHandler: [ui],
    errorHandler: [ui],
    sys_pn: "entry",
    partHandler: [ui]
  }

  let v = ui.mget(_a.value)
  let shower_state = 0;
  let content = '';
  if (v) {
    let { name, emoji } = emojiFlags.countryCode(v) || {}
    if (name && emoji) {
      shower_state = 1;
      content = `<span class="flag">${emoji}</span><span class="name">${name}</span>`
    }
  }
  return Skeletons.Box.X({
    className: `${pfx}-container`,
    debug: __filename,
    kids: [
      Skeletons.Entry(args),
      Skeletons.Note({
        className: `${pfx}-shower`,
        sys_pn: "shower",
        state: shower_state,
        partHandler: [ui],
        content,
        dataset: {
          state: shower_state
        }
      }),
      Skeletons.Button.Svg({
        className: `${pfx}-icon`,
        ico: 'carret-down',
        state: 0,
        sys_pn: "carret",
        icons: ['carret-down', 'carret-up',],
        service: 'show-menu'
      })
    ]
  })
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function menu_input(ui) {
  ui.debug("AAA:57")
  let Container, Main, Items;
  if (ui.mget(_a.axis == _a.x)) {
    Container = Skeletons.Box.X;
    Main = Skeletons.Box.X;
    Items = Skeletons.Wrapper.X;
  } else {
    Container = Skeletons.Box.Y;
    Main = Skeletons.Box.Y;
    Items = Skeletons.Wrapper.Y;
  }
  let kids = Main({
    className: `${ui.fig.family}__main`,
    debug: __filename,
    kids: [
      entry(ui),
      Skeletons.Box.X({
        className: `${ui.fig.family}__items-wrapper`,
        dataset: {
          axis: ui.mget(_a.axis)
        },
        sys_pn: "wrapper",
        kids: Items({
          className: `${ui.fig.family}__items-content`,
          dataset: {
            axis: ui.mget(_a.axis)
          },
          sys_pn: "items"
        })
      }),
    ]
  });

  return Container({
    className: `${ui.fig.family}__main`,
    debug: __filename,
    uiHandler: [ui],
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}__container`,
        kids,
      })
    ]
  });
}
module.exports = menu_input;