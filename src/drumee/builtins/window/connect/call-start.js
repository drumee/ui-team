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

module.exports = { acceptStartsCall, startOnce };
