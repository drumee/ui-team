// ===========================================================
//
// ===========================================================
const __webrtc_device_list = function (_ui_, audioInput, audioOutput, inputSelected, outputSelected) {

  var kids = [Skeletons.Note({
    className: `device-heading`,
    content: LOCALE.MICROPHONE
  })];
  
  let inputChannel = _.uniqueId();
  audioInput.forEach(element => {
    kids.push(Skeletons.Note({
      className: `device-label`,
      service: 'input-device-select',
      uiHandler: [_ui_],
      dataset: {
        deviceId: element.deviceId
      },
      state: (inputSelected === element.deviceId) ? 1 : 0,
      radio: inputChannel,
      content: element.label
    }));
  });

  kids.push(Skeletons.Note({
    className: `device-heading`,
    content: LOCALE.SPEAKERS
  }));

  let outputChannel = _.uniqueId();
  audioOutput.forEach(element => {
    kids.push(Skeletons.Note({
      className: `device-label`,
      service: 'output-device-select',
      uiHandler: [_ui_],
      dataset: {
        deviceId: element.deviceId
      },
      state: (outputSelected === element.deviceId) ? 1 : 0,
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
