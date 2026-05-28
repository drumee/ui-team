
function buildProgress(ui, msg, spinner) {
  const state = msg ? 1 : 0;
  return Skeletons.Box.X({
    className: `${ui.fig.family}__progress-container`,
    sys_pn: "progress",
    service: "hide-progress",
    dataset: spinner ? { state, loading: "indeterminate" } : { state },
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}__progress-bar`,
        sys_pn: "progress-bar"
      }),
      Skeletons.Note({
        content: msg || LOCALE.PROCESSING,
        className: `${ui.fig.family}__progress-text`,
        sys_pn: "progress-text"
      })
    ]
  });
}

const __document_player = function (ui, msg, opt = {}) {
  const { spinner = false } = opt;
  const topbar = require("./topbar")(ui);

  const list = Skeletons.List.Smart({
    className: `${ui.fig.family}__list pdfViewer`,
    innerClass: "drive-content-scroll",
    sys_pn: _a.list,
    flow: _a.none,
    vendorOpt: Preset.List.Orange_e
  });

  const wrapper = Skeletons.Wrapper.Y({
    className: `${ui.fig.family}__overlay`,
    sys_pn: "overlay"
  });

  const main = Skeletons.Box.Y({
    className: `${ui.fig.group}__container`,
    sys_pn: _a.content,
    kids: [wrapper, list]
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__main`,
    partHandler: ui,
    kids: [topbar, main, buildProgress(ui, msg, spinner)]
  });
};

__document_player.edit = function (ui, msg) {
  const topbar = require("./topbar")(ui);
  const main = Skeletons.Box.Y({
    className: `${ui.fig.group}__container`,
    sys_pn: _a.content
  });
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__main`,
    partHandler: ui,
    kids: [topbar, main, buildProgress(ui, msg, true)]
  });
};

module.exports = __document_player;
