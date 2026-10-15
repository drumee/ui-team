// Stopping OUR screen share. The viewer tears down its copy of the screen only
// when it hears about the stop — the STOP_REMOTE_SCREEN broadcast or the
// desktop track's presence mute. Those used to be sent LAST, behind the
// tab-audio release (two queued Jingle operations on the shared _trackOp
// chain) and an HTTP update; one stalled step and the viewer was left on the
// last frame for the rest of the call. Signal first, clean up after, and
// time-box everything so nothing can hang the caller.
const DEFAULT_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      () => { clearTimeout(t); resolve(undefined); }
    );
  });
}

async function stopPresentationSequence(host, track, opt) {
  const { desktop, broadcast, update } = opt;
  const timeoutMs = opt.timeoutMs || DEFAULT_TIMEOUT_MS;
  // Must run even with no desktop track, or the mixer stays on the mic.
  const release = withTimeout(
    Promise.resolve().then(() => host._releaseDesktopAudio()),
    timeoutMs
  );
  if (!track) {
    await release;
    host.warn("No track to stop");
    return;
  }
  // The OS "Stop sharing" bar reaches us twice for one stop (the raw track's
  // `ended` and lib-jitsi-meet's LOCAL_TRACK_STOPPED): signal once per track.
  host._stoppedDesktopTracks = host._stoppedDesktopTracks || new WeakSet();
  if (host._stoppedDesktopTracks.has(track)) {
    await release;
    return;
  }
  host._stoppedDesktopTracks.add(track);
  const me = host.room.myUserId();
  const payload = { id: me, srcId: me };
  await Promise.all([
    withTimeout(host.sendRoomSignaling(broadcast, { event: "STOP_REMOTE_SCREEN", payload }), timeoutMs),
    withTimeout(host.stopLocalTrack(desktop), timeoutMs),
    withTimeout(host.sendRoomSignaling(update), timeoutMs),
  ]);
  await release;
}

module.exports = { stopPresentationSequence, withTimeout };
