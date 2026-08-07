// Mixes a captured tab/system audio track INTO the microphone track, so remote
// peers hear the sound of a shared Chrome tab (YouTube, a video, a call) instead
// of a silent screen.
//
// Why mix instead of sending a second track: JitsiConference.addTrack() allows
// exactly ONE local track per media type. Multi-stream send is permitted for
// VIDEO with distinct videoTypes only — that is how camera + screen coexist here
// — and any second audio track is rejected outright with "Cannot add second
// audio track to the conference". So the two audio sources have to become one
// MediaStream before they reach the peer connection.
//
// JitsiLocalTrack.setEffect() does exactly that: it swaps the stream behind the
// EXISTING mic track (_removeLocalTrackFromPc -> _switchStreamEffect ->
// _addLocalTrackToPc), leaving the track count, the SDP m-lines and the remote
// receive path untouched. Nothing changes server-side.
//
// setMuted/isMuted are not decoration — JitsiLocalTrack._setMuted and isMuted()
// look for them and prefer them when present, so muting the mic disables only
// the microphone leg of the mixer and the shared tab audio keeps playing for
// remotes. Without them, mute would silence the mixed output and take the tab
// audio down with it.
const JitsiMeetJS = require("vendor/lib/jitsi/lib-jitsi-meet.min.js");

class AudioMixerEffect {
  /**
   * @param {JitsiLocalTrack} desktopAudioTrack - the audio track returned by the
   *   desktop capture, to be mixed into the microphone.
   */
  constructor(desktopAudioTrack) {
    if (!desktopAudioTrack || desktopAudioTrack.getType() !== _a.audio) {
      throw new Error("AudioMixerEffect requires an audio track to mix in");
    }
    this._desktopAudio = desktopAudioTrack;
  }

  /**
   * setEffect() rejects with "Incompatible effect instance!" unless this passes.
   */
  isEnabled(sourceLocalTrack) {
    return (
      !!sourceLocalTrack &&
      sourceLocalTrack.isAudioTrack() &&
      this._desktopAudio.isAudioTrack()
    );
  }

  /**
   * Called by _startStreamEffect with the ORIGINAL mic stream. Whatever we
   * return becomes the stream the peer connection sends.
   */
  startEffect(micStream) {
    this._micStream = micStream;
    // Keep the mic's own MediaStreamTrack: setMuted toggles this one, so the
    // mute lands on the microphone leg and not on the mixed output.
    this._micTrack = micStream.getTracks()[0];
    this._mixer = JitsiMeetJS.createAudioMixer();
    this._mixer.addMediaStream(this._desktopAudio.getOriginalStream());
    this._mixer.addMediaStream(this._micStream);
    const mixed = this._mixer.start();
    // A fresh AudioContext can come up "suspended" under Chrome's autoplay
    // policy, and everything routed through it — the MICROPHONE included —
    // would go out silent. AudioMixer builds its context internally and does
    // not expose it, so reach for it defensively rather than risk that.
    const ctx = this._mixer._audioContext;
    if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
      ctx.resume().catch(() => { });
    }
    return mixed;
  }

  /**
   * Called by _stopStreamEffect, which then restores the original mic stream and
   * re-reads isMuted() from it — so a mute the user applied while mixing (it
   * lives on _micTrack, a track of that same original stream) survives unmixing.
   */
  stopEffect() {
    if (this._mixer) {
      const ctx = this._mixer._audioContext;
      this._mixer.reset();
      // reset() drops its AudioContext reference without closing it, so every
      // share/stop cycle would leak one — and browsers cap how many a page may
      // hold. Safe to close here: the caller has already detached the mixed
      // stream from the peer connection before stopEffect runs.
      if (ctx && ctx.state !== "closed" && typeof ctx.close === "function") {
        ctx.close().catch(() => { });
      }
    }
    this._mixer = null;
  }

  setMuted(muted) {
    if (this._micTrack) this._micTrack.enabled = !muted;
  }

  isMuted() {
    return this._micTrack ? !this._micTrack.enabled : false;
  }
}

module.exports = AudioMixerEffect;
