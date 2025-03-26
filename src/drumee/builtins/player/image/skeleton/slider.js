
const __image_player_slider = function (_ui_, opt) {

  const actionButtons = Skeletons.Box.X({
    className: `${_ui_.fig.family}__action-buttons`,
    sys_pn: 'action-buttons',
    dataset: {
      mode: _a.closed
    },
    kids: [
      Skeletons.Button.Svg({
        ico: "drumee-play",//"desktop_musicplay",
        className: "icon play",
        service: _a.play,
        uiHandler: _ui_,
        sys_pn: 'ctrl-play'
      }),

      Skeletons.Button.Svg({
        ico: "cross",//"account_cross",
        className: "icon close",
        service: 'close-player',
        uiHandler: _ui_,
        sys_pn: 'ctrl-close'
      })
    ]
  });

  const buttons = Skeletons.Box.X({
    className: `${_ui_.fig.family}__slider-buttons`,
    sys_pn: "slider-buttons",
    kids: [
      Skeletons.Button.Svg({
        ico: "mini-arrow-left-new",
        className: "button prev",
        service: _a.prev,
        uiHandler: _ui_,
        sys_pn: 'ctrl-prev'
      }),
      Skeletons.Box.Y({
        className: "progress",
        sys_pn: 'progress',
        state: 1
      }),
      Skeletons.Button.Svg({
        ico: "mini-arrow-right-new",
        className: "button next",
        service: _a.next,
        uiHandler: _ui_,
        sys_pn: 'ctrl-next'
      })
    ]
  });

  let high = _ui_.actualNode(_a.slide).url;
  let low = _ui_.actualNode(_a.preview).url;
  const slider = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__slider-container`,
    sys_pn: 'slider',
    kids: [
      Skeletons.Image.Smart({ sys_pn: "slider-content", low, high }),
    ]
  });

  const prev = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__slider-container`,
    state: 0,
    sys_pn: 'prev-slider'
  });

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__slider-main`,
    sys_pn: 'slider-wrapper',
    debug: __filename,
    kids: [actionButtons, prev, slider, buttons]
  });

  return a;
};

module.exports = __image_player_slider;
