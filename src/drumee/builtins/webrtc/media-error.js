// Turning a getUserMedia failure into something the user can act on.
//
// "Denied in the browser", "no device plugged in" and "another app is holding
// the device" all reach us as one opaque rejection. Reporting them all as a
// permission problem — or worse, as the account-privilege message the generic
// startup catch used to pick — sends people to the wrong fix.
//
// lib-jitsi-meet normalises the browser DOMException into a `gum.*` name and
// keeps the original under `error.gum.error`; NotReadableError / AbortError
// (device busy) fall through its switch to `gum.general`, so both the Jitsi
// name and the underlying DOMException name have to be inspected.
//
// Shared by the webrtc room base (private meetings/calls) and the DMZ guest
// meeting, which have no common ancestor.

// Which device(s) the failed request was for, for the {0} placeholder the
// device strings carry. Jitsi records them on the error as ["audio"],
// ["audio","video"], … — fall back to naming both when it doesn't.
function mediaDeviceLabel(error) {
  const devices = (error && error.gum && error.gum.devices) || [];
  const names = devices
    .map((d) =>
      d === _a.video
        ? LOCALE.CAMERA.toLowerCase()
        : d === _a.audio
          ? LOCALE.MICROPHONE.toLowerCase()
          : d,
    )
    .filter(Boolean);
  if (!names.length) {
    return `${LOCALE.MICROPHONE.toLowerCase()} / ${LOCALE.CAMERA.toLowerCase()}`;
  }
  return names.join(" / ");
}

// The user-facing sentence for a local-media failure. Every branch runs the
// locale string through .format() — DEVICES_PERMISSION_DENIED carries a {0}
// placeholder that used to render literally.
function mediaErrorMessage(error) {
  const label = mediaDeviceLabel(error);
  const name = (error && error.name) || "";
  const cause =
    (error && error.gum && error.gum.error && error.gum.error.name) ||
    (error && error.constructor && error.constructor.name) ||
    "";
  const both = `${name} ${cause}`;
  if (/permission_denied|NotAllowedError|SecurityError/.test(both)) {
    return LOCALE.MEDIA_BLOCKED_BY_BROWSER.format(label);
  }
  if (/not_found|NotFoundError/.test(both)) {
    return LOCALE.MEDIA_DEVICE_NOT_FOUND.format(label);
  }
  if (/NotReadableError|AbortError|TrackStartError/.test(cause)) {
    return LOCALE.MEDIA_DEVICE_BUSY.format(label);
  }
  return LOCALE.DEVICES_PERMISSION_DENIED.format(label);
}

module.exports = { mediaDeviceLabel, mediaErrorMessage };
