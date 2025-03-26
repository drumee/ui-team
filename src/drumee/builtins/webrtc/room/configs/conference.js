module.exports = function (opt = {}) {
	const { domain, stunServers } = opt;
	let configs = {
		audioQuality: {
			stereo: false
		},
		bridgeChannel: {},
		channelLastN: -1,
		disableAP: false,
		disableAudioLevels: false,
		disableSimulcast: false,
		enableNoAudioDetection: false,
		enableNoisyMicDetection: false,
		enableOpusRed: false,
		enableTalkWhileMuted: true,
		e2eping: {
			pingInterval: 5
		},
		focusUserJid: `focus@auth.${domain}`,
		p2p: {
			enabled: false, // true is not working !!! - check urls ?
			// preferredCodec: 'H264',
			// codecPreferenceOrder: ['VP9', 'VP8', 'H264'],
			// mobileCodecPreferenceOrder: ['H264', 'VP8', 'VP9'],
			// stunServers: [
			// 	{ urls: 'stun:meet-jit-si-turnrelay.jitsi.net:443' },
			// ],
		},
		startVideoMuted: 10,
		startWithVideoMuted: true,
		flags: {
			sourceNameSignaling: true,
			sendMultipleVideoStreams: true,
			receiveMultipleVideoStreams: true
		},
		desktopSharingFrameRate: {
			min: 5,
			max: 5
		},
		startAudioOnly: false,
		startAudioMuted: 10,
		startWithAudioMuted: false,
		startSilent: false,
		hideAddRoomButton: false,
		localRecording: {
			disable: false,
			notifyAllParticipants: true,
			disableSelfRecording: false
		},
		analytics: {},
		enableStatsID: false,
		enableCalendarIntegration: false,
		prejoinConfig: {
			enabled: true,
			hideDisplayName: false
		},
		enableWelcomePage: true,
		enableClosePage: false,
		requireDisplayName: false,
		disableProfile: false,
		roomPasswordNumberOfDigits: false,
		enableLipSync: false,
		enableRemb: true,
		enableTcc: true,
		useIPv6: true,
		transcription: {
			enabled: false,
			translationLanguages: [],
			translationLanguagesHead: [
				Visitor.language(), "en"
			],
			useAppLanguage: true,
			preferredLanguage: "en-US",
			disableStartForAll: false,
			autoCaptionOnRecord: false
		},
		testing: {
			octo: {
				probability: 0
			},
			capScreenshareBitrate: 1
		},
		videoQuality: {
			codecPreferenceOrder: ['VP9', 'VP8', 'H264'],
			maxBitratesVideo: {
				H264: {
					low: 200000,
					standard: 500000,
					high: 1500000,
				},
				VP8: {
					low: 200000,
					standard: 500000,
					high: 1500000,
				},
				VP9: {
					low: 100000,
					standard: 300000,
					high: 1200000,
				},
			},
			minHeightForQualityLvl: {
				360: 'standard',
				720: 'high',
			},
			mobileCodecPreferenceOrder: [ 'VP8', 'VP9', 'H264' ],
		},
		disableReactions: false,
		disablePolls: false,
		disabledSounds: [],
		e2ee: {},
		defaultLocalDisplayName: Visitor.fullname(),
		defaultRemoteDisplayName: "Fellow Jitster",
		recordingService: {},
		liveStreaming: {},
		speakerStats: {}
	}
	if (stunServers) {
		configs.p2p.stunServers = configs.p2p.stunServers.concat(stunServers);
	}
	return configs;
}