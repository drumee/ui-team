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

  // Virtual-background actions. Wired to services now; the actual video effect
  // pipeline is a TODO — the bundled lib-jitsi-meet has no segmentation /
  // background-effect module (see room/index.js handlers).
  kids.push(Skeletons.Button.Label({
    className: `device-label device-action`,
    ico: "sparkle",
    label: LOCALE.BLUR_BACKGROUND,
    labelClass: `device-action-label`,
    service: 'blur-background',
    uiHandler: [_ui_],
  }));

  kids.push(Skeletons.Button.Label({
    className: `device-label device-action`,
    ico: "upload-simple",
    label: LOCALE.UPLOAD_BACKGROUND,
    labelClass: `device-action-label`,
    service: 'upload-background',
    uiHandler: [_ui_],
  }));

  kids.push(Preset.ConfirmButtons(_ui_, {
    cancelLabel: LOCALE.CANCEL || '',
    cancelService: 'close-camera-select',
    confirmLabel: LOCALE.CONFIRM,
    confirmService: 'confirm-camera-selection',
    cancelBtnClass: 'mic-selection',
    confirmBtnClass: 'mic-selection',
  }))


  const a = Skeletons.Box.Y({
    className: `device-list`,
    kids: kids
  });

  return a;
};
module.exports = __webrtc_video_device_list;
