// ===========================================================
// Camera (video-input) picker — Figma "camera-dropdown" (node 2568:29800).
// Heading + camera icon, the enumerated cameras (active row highlighted with
// the brand tint via [data-state="1"]), then two virtual-background actions
// (Blur Background / Upload Background), and the shared confirm/cancel footer.
// Camera has no output-sink half, so only the videoinput side is built.
// ===========================================================
const __webrtc_video_device_list = function (_ui_, videoInput, inputSelected) {

  var kids = [Skeletons.Box.X({
    className: `device-heading`,
    kids: [
      Skeletons.Image.Svg({ ico: "meet-camera" }),
      Skeletons.Note({ content: LOCALE.CAMERA })
    ]
  })];

  // Always highlight an active camera, like the audio picker does. Audio can
  // fall back to its "default" pseudo-device row when the selected id matches
  // nothing, but browsers expose NO "default" videoinput — so when there's no
  // match (camera off, or the live-track id doesn't round-trip) fall back to
  // the FIRST camera instead of leaving every row unselected.
  const hasInputMatch = videoInput.some(e => e.deviceId === inputSelected);

  let inputChannel = _.uniqueId();
  videoInput.forEach((element, i) => {
    kids.push(Skeletons.Note({
      className: `device-label`,
      service: 'video-device-select',
      uiHandler: [_ui_],
      dataset: {
        deviceId: element.deviceId
      },
      state: (inputSelected === element.deviceId ||
        (!hasInputMatch && i === 0)) ? 1 : 0,
      radio: inputChannel,
      content: element.label
    }));
  });

  // Virtual-background actions (real MediaPipe effects, see
  // room/effects/background-effect.js). Blur Background toggles blur; Upload
  // Background opens the backgrounds & effects panel beside this list.
  kids.push(Skeletons.Button.Label({
    // blur-background-ctrl: marker so the room can sync this row's active/
    // loading state with the effects-panel blur tile (see _syncBgUi).
    className: `device-label device-action blur-background-ctrl`,
    ico: "sparkle",
    label: LOCALE.BLUR_BACKGROUND,
    labelClass: `device-action-label`,
    service: 'blur-background',
    uiHandler: [_ui_],
  }));

  kids.push(Skeletons.Button.Label({
    className: `device-label device-action upload-background-ctrl`,
    ico: "upload-simple",
    label: LOCALE.UPLOAD_BACKGROUND,
    labelClass: `device-action-label`,
    service: 'upload-background',
    uiHandler: [_ui_],
  }));

  // Design order: primary [Save] first, then [Cancel] — mirrors the audio
  // device picker (device-list.js).
  kids.push(Skeletons.Box.X({
    className: `${_ui_.fig.family}__buttons-wrapper buttons u-ai-center`,
    kids: [
      Skeletons.Note({
        content: LOCALE.SAVE,
        service: 'confirm-camera-selection',
        className: `${_ui_.fig.family}__button-confirm mic-selection button-confirm button clickable`,
        uiHandler: _ui_,
        haptic: 300,
        dataset: { error: 0 }
      }),
      Skeletons.Note({
        content: LOCALE.CANCEL || '',
        service: 'close-camera-select',
        className: `${_ui_.fig.family}__button-cancel mic-selection button-cancel button clickable`,
        uiHandler: _ui_
      })
    ]
  }))


  const a = Skeletons.Box.Y({
    className: `device-list`,
    kids: kids
  });

  return a;
};
module.exports = __webrtc_video_device_list;
