// Viewer-side watch on a REMOTE screen share's MediaStreamTrack.
//
// `ended` is final: the sender is gone — clear the view.
// `mute` means no RTP is arriving. That is ALSO what a perfectly static shared
// screen can look like (the encoder may send nothing while nothing changes),
// so a mute only ever reports a stall — the view dims — and never tears the
// share down. Teardown stays with the explicit signals: STOP_REMOTE_SCREEN,
// the presence mute (TRACK_MUTE_CHANGED), TRACK_REMOVED, `ended`.
function watchRemoteScreen(mediaTrack, cb = {}, opt = {}) {
  if (!mediaTrack || typeof mediaTrack.addEventListener !== "function") {
    return () => {};
  }
  const stallMs = opt.stallMs || 2000;
  const setTimer = opt.setTimer || setTimeout;
  const clearTimer = opt.clearTimer || clearTimeout;
  let timer = null;
  let stalled = false;
  let done = false;

  const onEnded = () => {
    if (done) return;
    dispose();
    if (cb.onEnded) cb.onEnded();
  };
  const onMute = () => {
    if (timer != null || stalled) return;
    timer = setTimer(() => {
      timer = null;
      stalled = true;
      if (cb.onStall) cb.onStall();
    }, stallMs);
  };
  const onUnmute = () => {
    if (timer != null) {
      clearTimer(timer);
      timer = null;
    }
    if (stalled) {
      stalled = false;
      if (cb.onResume) cb.onResume();
    }
  };
  function dispose() {
    done = true;
    if (timer != null) clearTimer(timer);
    timer = null;
    mediaTrack.removeEventListener("ended", onEnded);
    mediaTrack.removeEventListener("mute", onMute);
    mediaTrack.removeEventListener("unmute", onUnmute);
  }
  mediaTrack.addEventListener("ended", onEnded);
  mediaTrack.addEventListener("mute", onMute);
  mediaTrack.addEventListener("unmute", onUnmute);
  return dispose;
}

// A STOP for presenter X must not tear down a NEW share by presenter Y that
// started in the meantime (stop → re-share within seconds).
function shouldStopForPresenter(currentPresenterId, stoppingId) {
  if (!currentPresenterId) return true;
  return currentPresenterId === stoppingId;
}

module.exports = { watchRemoteScreen, shouldStopForPresenter };
