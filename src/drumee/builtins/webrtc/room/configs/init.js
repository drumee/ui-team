module.exports = function () {
	return  {
		useIPv6: true,
		disableSimulcast: false,
		enableAnalyticsLogging: true,
		// Defense-in-depth for the "audio cut on screen share" bug: don't offer
		// SYSTEM audio in the getDisplayMedia picker (Chromium >104 reads this
		// via JitsiMeetJS.init -> ScreenObtainer). NOT sufficient on its own —
		// lib-jitsi-meet still requests audio:true so a tab-audio track can
		// still be returned; the authoritative fix is the guard in jitsi.js
		// createLocalTracks that drops any desktop-origin audio track.
		screenShareSettings: { desktopSystemAudio: 'exclude' },
		// enableWindowOnErrorHandler : true
	};
}