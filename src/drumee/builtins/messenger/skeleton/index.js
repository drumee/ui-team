
const __skl_messenger = function (ui) {

  let a, upload;
  if (ui.canUpload()) {
    upload = Skeletons.Button.Svg({
      className: `${ui.fig.family}__icon attach`,
      ico: ui.mget('attach_icon') || "message_attach",
      service: "attach"
    });
  } else {
    upload = Skeletons.Box.X();
  }

  const kids = [
    Skeletons.FileSelector({
      sys_pn: "fselector",
      bubble: 0,
      service: "",
      partHandler: [ui],
      uiHandler: [ui]
    }),

    upload,

    Skeletons.RichText({
      sys_pn: _a.content,
      name: _a.content,
      content: ui.mget(_a.content),
      mode: _a.interactive,
      placeholder: ui.getPlaceholder(),
      autofocus: ui.mget('autofocus'),
      className: `${ui.fig.family}__content`,
      service: _e.submit,
      shift_enter_delay: ui.mget('shift_enter_delay') || 1200,
      // Without uiHandler, RichText keyup's triggerHandlers has no parent to dispatch to,
      // so messenger.onUiEvent('interactive') never fires and the mention popup stays closed.
      uiHandler: [ui]
    }),
  ];

  if (!ui.mget('no_emoji')) {
    kids.push(Skeletons.Button.Svg({
      className: `${ui.fig.family}__icon emoji`,
      ico: "message_smile",
      sys_pn: "message-smile",
      uiHandler: ui,
      service: _a.emoji
    }));
  }

  kids.push(Skeletons.Button.Svg({
    className: `${ui.fig.family}__icon submit`,
    ico: ui.mget('send_icon') || "send",
    sys_pn: _a.submit,
    uiHandler: ui,
    service: _a.submit,
    dataset: {
      state: _a.idle
    }
  }));

  const container = Skeletons.Box.X({
    className: `${ui.fig.family}__container`,
    debug: __filename,
    kids: kids
  });

  return [
    Skeletons.Box.Y({
      className: `${ui.fig.family}__main`,
      debug: __filename,
      kids: [container]
    }),

    Skeletons.Wrapper.Y({
      className: `${ui.fig.family}__wrapper-popup`,
      name: "popup"
    }),

    Skeletons.Wrapper.Y({
      className: `${ui.fig.family}__attach-menu`,
      name: "attach-menu"
    })

  ];
};

module.exports = __skl_messenger;
