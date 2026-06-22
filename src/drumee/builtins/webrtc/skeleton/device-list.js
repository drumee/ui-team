// ===========================================================
//
// ===========================================================
const __webrtc_device_list = function (_ui_, audioInput, audioOutput, inputSelected, outputSelected) {

  var kids = [Skeletons.Note({
    className: `device-heading`,
    content: LOCALE.MICROPHONE
  })];
  
  // When the selected id matches no enumerated device (e.g. the live track
  // reports a raw hardware id while the list only carries the 'default'
  // pseudo-device), highlight the 'default' row instead of leaving every row
  // unselected — otherwise the radio group renders blank and the popup looks
  // like it reverted to the first item.
  const hasInputMatch = audioInput.some(e => e.deviceId === inputSelected);

  let inputChannel = _.uniqueId();
  audioInput.forEach(element => {
    kids.push(Skeletons.Note({
      className: `device-label`,
      service: 'input-device-select',
      uiHandler: [_ui_],
      dataset: {
        deviceId: element.deviceId
      },
      state: (inputSelected === element.deviceId ||
        (!hasInputMatch && element.deviceId === "default")) ? 1 : 0,
      radio: inputChannel,
      content: element.label
    }));
  });

  kids.push(Skeletons.Note({
    className: `device-heading`,
    content: LOCALE.SPEAKERS
  }));

  const hasOutputMatch = audioOutput.some(e => e.deviceId === outputSelected);

  let outputChannel = _.uniqueId();
  audioOutput.forEach(element => {
    kids.push(Skeletons.Note({
      className: `device-label`,
      service: 'output-device-select',
      uiHandler: [_ui_],
      dataset: {
        deviceId: element.deviceId
      },
      state: (outputSelected === element.deviceId ||
        (!hasOutputMatch && element.deviceId === "default")) ? 1 : 0,
      radio: outputChannel,
      content: element.label
    }));
  });

  kids.push(Preset.ConfirmButtons(_ui_, {
    cancelLabel: LOCALE.CANCEL || '',
    cancelService: 'close-device-select',
    confirmLabel: LOCALE.CONFIRM,
    confirmService: 'confirm-device-selection',
    cancelBtnClass: 'mic-selection',
    confirmBtnClass: 'mic-selection',
  }))


  const a = Skeletons.Box.Y({
    className: `device-list`,
    kids: kids
  });

  return a;
};
module.exports = __webrtc_device_list;
