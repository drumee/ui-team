// A remote VIDEO track's type (camera vs desktop) can settle a beat after the
// track arrives. The tile used to wait a fixed 3 s before showing any camera.
// Show it now; if the type later turns out to be a screen, hand it back.
function settleVideoType(track, opt) {
  const { changedEvent, desktop, onCamera, onDesktop } = opt;
  if (track.getVideoType() == desktop) {
    onDesktop();
    return () => {};
  }
  const onChange = () => {
    if (track.getVideoType() != desktop) return;
    dispose();
    onDesktop();
  };
  function dispose() {
    track.removeEventListener(changedEvent, onChange);
  }
  track.addEventListener(changedEvent, onChange);
  onCamera();
  return dispose;
}

module.exports = { settleVideoType };
