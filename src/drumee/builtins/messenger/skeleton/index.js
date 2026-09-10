
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

  // Drop affordance, rendered only for hosts that ask for it (the chat
  // composer). It lives INSIDE the messenger because the messenger is the drop
  // zone, and a sibling could not cover it: `inset: 0` resolves against the
  // nearest positioned ancestor, which for a sibling is the wrapper — that
  // would tint the reply box and the attachment strip too.
  //
  // Inert to the pointer. A jQuery-UI drag is tracked by the droppable, not by
  // hit-testing, and an overlay that swallowed the pointer would break the
  // clicks that follow a cancelled drag.
  const dropOverlay = ui.mget('drop_overlay')
    ? Skeletons.Box.X({
        // A ROW, not the reference image's stack. The composer is a ~48px bar
        // (chat skin: min-height 32 + 8px padding), and a stacked 24px glyph
        // over an 18px label needs ~50px before it can be centred in anything.
        // Same elements and the same dashed-indigo language, laid out to fit
        // the box it actually has to live in.
        className: `${ui.fig.family}__drop-overlay`,
        bubble: 0,
        kids: [
          Skeletons.Image.Svg({
            ico: 'arrow-down',
            className: `${ui.fig.family}__drop-overlay-ico`
          }),
          Skeletons.Note({
            className: `${ui.fig.family}__drop-overlay-text`,
            content: LOCALE.DROP_FILES_TO_ATTACH
          })
        ]
      })
    : null;

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
    }),

    dropOverlay

  ].filter(Boolean);
};

module.exports = __skl_messenger;
