// Remembered microphone / speaker choice, per browser (localStorage).
//
// Until now the pick only lived on the room widget (preferredInputDevice /
// preferredOutputDevice), so every new meeting silently went back to the OS
// "default" device. When that default is a device that delivers silence
// (a dropped Bluetooth headset, a phone's continuity mic, a virtual audio
// device left behind by another app) the user is inaudible and nothing in the
// UI tells them why. Google Meet survives the same setup because it re-applies
// the device the user chose last time; this module gives Drumee the same
// memory. A remembered id is only handed to getUserMedia / setSinkId when the
// device is still present (see resolve), otherwise it is forgotten.
const KEY = "drumee.webrtc.devices";

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === "object" ? data : {};
  } catch (e) {
    return {};
  }
}

function write(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // Storage blocked (private mode, quota): the pick still applies to the
    // current meeting, it is just not remembered.
  }
}

/**
 * Current devices of one kind ("audioinput" / "audiooutput"). Labels and ids
 * are only populated once the microphone permission is granted, which is
 * always the case by the time the room asks (tracks are created first).
 */
async function list(kind) {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === kind);
  } catch (e) {
    return [];
  }
}

module.exports = {
  load() {
    const d = read();
    return {
      input: typeof d.input === "string" && d.input ? d.input : null,
      output: typeof d.output === "string" && d.output ? d.output : null,
    };
  },

  saveInput(id) {
    const d = read();
    if (id) d.input = id;
    else delete d.input;
    write(d);
  },

  saveOutput(id) {
    const d = read();
    if (id) d.output = id;
    else delete d.output;
    write(d);
  },

  /**
   * Check that a remembered device id still exists. Returns the id when the
   * device is present, null otherwise (and drops the stale preference, so an
   * unplugged headset is not offered to getUserMedia meeting after meeting).
   * @param {"input"|"output"} slot
   * @param {string|null} id
   */
  async resolve(slot, id) {
    if (!id) return null;
    const kind = slot === "output" ? "audiooutput" : "audioinput";
    const devices = await list(kind);
    // Before the microphone permission is granted every entry carries an
    // empty deviceId, and some browsers list no output devices at all. That
    // is "unknown", not "unplugged": trust the id, the constraint is ideal
    // (not exact) so the browser falls back on its own if it is wrong.
    const known = devices.filter((d) => d.deviceId);
    if (!known.length) return id;
    if (known.some((d) => d.deviceId === id)) return id;
    if (slot === "output") this.saveOutput(null);
    else this.saveInput(null);
    return null;
  },

  list,
};
