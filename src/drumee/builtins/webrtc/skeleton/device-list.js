// ===========================================================
//
// ===========================================================
const __webrtc_device_list = function (_ui_, audioInput, audioOutput, inputSelected, outputSelected) {

  var kids = [Skeletons.Note({
    className: `device-heading`,
    content: LOCALE.MICROPHONE
  })];

  // Live mic-level meter — the room widget (webrtc/room) drives the segments
  // imperatively from an AnalyserNode on a preview stream of the selected input
  // device (see _startMicMeter), so the user can confirm the mic they pick is
  // actually picking up their voice before hitting Confirm.
  const MIC_METER_SEGMENTS = 14;
  kids.push(Skeletons.Box.Y({
    className: `device-mic-test`,
    kids: [
      Skeletons.Box.X({
        className: `device-mic-meter`,
        kids: Array.from({ length: MIC_METER_SEGMENTS }, () =>
          Skeletons.Box.Y({ className: `device-mic-meter-seg` })
        )
      }),
      Skeletons.Note({
        className: `device-mic-test-hint`,
        content: LOCALE.SPEAK_TO_TEST_MIC
      })
    ]
  }));

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

  // Design order: primary [Save] first, then [Cancel]. The shared
  // Preset.ConfirmButtons is hard-coded Cancel-first, so build the pair here
  // with the same class recipe to keep its styling.
  kids.push(Skeletons.Box.X({
    className: `${_ui_.fig.family}__buttons-wrapper buttons u-ai-center`,
    kids: [
      Skeletons.Note({
        content: LOCALE.SAVE,
        service: 'confirm-device-selection',
        className: `${_ui_.fig.family}__button-confirm mic-selection button-confirm button clickable`,
        uiHandler: _ui_,
        haptic: 300,
        dataset: { error: 0 }
      }),
      Skeletons.Note({
        content: LOCALE.CANCEL || '',
        service: 'close-device-select',
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
module.exports = __webrtc_device_list;
