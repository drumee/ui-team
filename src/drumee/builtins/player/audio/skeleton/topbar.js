// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/player/audio/skeleton/topbar.js
//   TYPE : Skeleton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
function __player_audio_topbar(_ui_) {
  const topBarFig = `${_ui_.fig.family}-topbar`;
  const cnWidowButton = "window-button";

  // Always show download; in a DMZ share without the download grant the click
  // is gated (sign-up / Request Access) in the player's onUiEvent.
  const downloadIcon = Skeletons.Box.X({
    className: `${_ui_.fig.group}-topbar__action ${topBarFig}__action`,
    sys_pn: "commands",
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-topbar__icon-wrapper`,
        kids: [
          Skeletons.Button.Svg({
            ico: "download",
            className: `${topBarFig}__icon icon link`,
            sys_pn: "download-button",
            service: _e.download,
            uiHandler: _ui_,
          }),
        ],
      }),
    ],
  });

  const name = Skeletons.Note({
    className: `${topBarFig}__note title`,
    content: LOCALE.MUSIC_PLAYER,
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWidowButton}__buttons-wrapper`,
    kids: [downloadIcon, require("../../skeleton/control")(_ui_)],
  });

  let a = Skeletons.Box.X({
    className: `${topBarFig}__main`,
    debug: __filename,
    sys_pn: "topbar",
    justify: _a.right,
    service: _e.raise,
    uiHandler: _ui_,
    kids: [
      Skeletons.Box.X({
        className: `${topBarFig}__title`,
        service: _e.raise,
        uiHandler: _ui_,
        kids: [name],
      }),
      buttons,
    ],
  });

  return a;
}

export default __player_audio_topbar;
