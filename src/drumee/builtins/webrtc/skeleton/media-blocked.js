// ===========================================================
// "Microphone / Camera blocked" guidance panel.
//
// Shown INSIDE the device picker (the mic pill's audio-devices wrapper, the
// camera pill's video-devices wrapper) in place of the device list whenever
// ensureMediaPermission() comes back false. It replaces the single flat line
// the picker used to show, which told the user they were blocked without
// telling them where to go.
//
// A blocked device has TWO possible gates and the browser only ever mentions
// the first: the site permission (padlock in the address bar) and the
// operating system's own privacy switch, which silently denies the browser
// itself. A user who allows the site and still gets nothing has no way to
// guess the second one exists — so both are spelled out, and the OS half
// names the real path for the platform they are actually on.
// ===========================================================

// Which OS the steps should describe. userAgentData is the modern source and
// is not spoofed by the compatibility tokens stuffed into userAgent; platform
// and the UA string are the fallbacks for browsers that do not expose it.
// Order matters: a macOS UA carries "Macintosh" and a Windows one "Windows NT",
// but "darwin" also contains "win", so mac has to be tested first.
function osFamily() {
  const nav = (typeof navigator !== "undefined" && navigator) || {};
  const uaData = nav.userAgentData || {};
  const probe = `${uaData.platform || ""} ${nav.platform || ""} ${nav.userAgent || ""}`
    .toLowerCase();
  // Phones and tablets first: the path there is per-vendor and per-browser
  // (and an iPad reports itself as a Mac), so they get the generic sentence
  // rather than a desktop path that does not exist on the device.
  if (/iphone|ipad|ipod|android/.test(probe)) return null;
  if (/mac/.test(probe)) return "mac";
  if (/win/.test(probe)) return "windows";
  if (/linux|cros|x11/.test(probe)) return "linux";
  return null;
}

// The OS half of the guidance, for the platform we think we are on. An
// unrecognised platform gets the generic sentence rather than a wrong path.
function systemHint(device) {
  switch (osFamily()) {
    case "mac":
      return LOCALE.ALLOW_IN_SYSTEM_MAC.format(device);
    case "windows":
      return LOCALE.ALLOW_IN_SYSTEM_WINDOWS.format(device);
    case "linux":
      return LOCALE.ALLOW_IN_SYSTEM_LINUX.format(device);
    default:
      return LOCALE.ALLOW_IN_SYSTEM_GENERIC.format(device);
  }
}

/**
 * @param {*} _ui_  the room widget (handles the Retry service)
 * @param {string} kind  _a.audio / _a.video — which pill this panel belongs to
 * @param {object} [opt]
 *   opt.device  name to put in the sentences, when the caller knows better
 *               than `kind` — e.g. "microphone / camera" when BOTH were
 *               refused at startup (media-error mediaDeviceLabel).
 *   opt.heading false drops the icon + title row, for a surface that already
 *               says what is wrong above the steps.
 *   opt.retry   false drops the Retry button, for a surface whose own message
 *               tells the user to start again rather than re-check in place.
 */
const __webrtc_media_blocked = function (_ui_, kind = _a.audio, opt = {}) {
  const isVideo = kind === _a.video;
  // The device's name, lowercased, for the sentences that embed it ("allow the
  // microphone"); the heading uses the capitalised form.
  const device =
    opt.device || (isVideo ? LOCALE.CAMERA : LOCALE.MICROPHONE).toLowerCase();

  const step = (content) =>
    Skeletons.Note({ className: `media-blocked-step`, content });

  const kids = [];

  if (opt.heading !== false) {
    kids.push(Skeletons.Box.X({
      className: `media-blocked-head`,
      kids: [
        Skeletons.Image.Svg({ ico: "apps-warning", className: `media-blocked-icon` }),
        Skeletons.Note({
          className: `media-blocked-title`,
          content: isVideo ? LOCALE.CAMERA_BLOCKED : LOCALE.MICROPHONE_BLOCKED,
        }),
      ],
    }));
  }

  kids.push(
    Skeletons.Note({
      className: `media-blocked-section`,
      content: LOCALE.ALLOW_IN_BROWSER,
    }),
    Skeletons.Box.Y({
      className: `media-blocked-steps`,
      kids: [
        step(LOCALE.ALLOW_IN_BROWSER_STEP_1),
        step(LOCALE.ALLOW_IN_BROWSER_STEP_2.format(device)),
        step(LOCALE.ALLOW_IN_BROWSER_STEP_3),
      ],
    }),

    Skeletons.Note({
      className: `media-blocked-section`,
      content: LOCALE.ALLOW_IN_SYSTEM,
    }),
    Skeletons.Note({
      className: `media-blocked-os`,
      content: systemHint(device),
    }),
  );

  // Re-checks the permission and swaps this panel back for the real device
  // list once the user has allowed it — so they never have to hunt for the
  // caret again after fixing the setting.
  //
  // Deliberately NOT carrying the shared `button-confirm button` classes the
  // pickers' Save uses: the meeting window styles those at a higher
  // specificity with a fixed 150px width, which would leave this one button
  // stranded mid-row. It is styled on its own class instead (command.scss).
  if (opt.retry !== false) {
    kids.push(
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__buttons-wrapper buttons u-ai-center`,
        kids: [
          Skeletons.Note({
            content: LOCALE.RETRY,
            service: "retry-media-permission",
            className: `media-blocked-retry clickable`,
            uiHandler: _ui_,
            dataset: { kind },
          }),
        ],
      }),
    );
  }

  return Skeletons.Box.Y({
    className: `device-list media-blocked`,
    kids,
  });
};

module.exports = __webrtc_media_blocked;
module.exports.osFamily = osFamily;
