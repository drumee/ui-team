module.exports = function () {
	return  {
		useIPv6: true,
		disableSimulcast: false,
		enableAnalyticsLogging: true,
		// Offer SYSTEM audio in the getDisplayMedia picker (Chromium >104 reads
		// this via JitsiMeetJS.init -> ScreenObtainer). This was 'exclude' while
		// captured audio was being discarded — it only ever suppressed the option
		// for ENTIRE-SCREEN shares, since Chrome offers tab audio for tab shares
		// regardless. Now that jitsi.js mixes captured audio into the microphone
		// (see _syncDesktopAudioMix / audio-mixer-effect.js), leaving it excluded
		// would make screen shares silent while tab shares carry sound.
		screenShareSettings: { desktopSystemAudio: 'include' },
		// enableWindowOnErrorHandler : true
	};
}