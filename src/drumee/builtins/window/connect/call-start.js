// The caller's window can be told "the callee accepted" twice: the server's
// join() pushes conference.accept, and the callee then sends its own. Only a
// window still ringing acts on it — the caller ('dial') starts the call, the
// callee's OTHER devices ('ring') hang up — and the start runs once.

function acceptStartsCall(state) {
  return state === "dial" || state === "ring";
}

function startOnce(host, start) {
  if (!host._startPromise) {
    host._startPromise = Promise.resolve()
      .then(start)
      .catch((e) => {
        host._startPromise = null;
        throw e;
      });
  }
  return host._startPromise;
}

// Ask for camera/mic at the click instead of after conference.join + the
// in-call skeleton. prepareConference reuses host._startupTracks.
function beginEarlyMedia(host) {
  if (!host._startupTracks) {
    // Called synchronously so getUserMedia is in flight BEFORE the join POST.
    let p;
    try {
      p = Promise.resolve(host._createStartupTracks());
    } catch (e) {
      p = Promise.reject(e);
    }
    host._startupTracks = p;
    p.catch(() => {}); // surfaced by the caller
  }
  return host._startupTracks;
}

// conference.join runs alongside the media request; if the media request
// fails (permission denied), don't use the room — we can't speak in it.
async function joinAfterEarlyMedia(host, join) {
  const media = host._startupTracks
    ? host._startupTracks.then(() => true, () => false)
    : Promise.resolve(true);
  const [ok, room] = await Promise.all([media, join()]);
  if (!ok || host._startupMediaFailed) return null;
  return room;
}

module.exports = { acceptStartsCall, startOnce, beginEarlyMedia, joinAfterEarlyMedia };
