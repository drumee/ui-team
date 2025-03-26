module.exports = function (opt) {
	return {
		constraints: {
			video: {
				height: {
					ideal: 720,
					max: 720,
					min: 180
				},
				width: {
					ideal: 1280,
					max: 1280,
					min: 320
				}
			}
		},
		resolution: 720,
		minFps : 5,
		maxFps : 20,
		fireSlowPromiseEvent : true,
		...opt
	}
}