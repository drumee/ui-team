


const configuration = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turns:turn.drumee.net:5349', username: 'turndr', credential: '7E7nQVua' },
  ]
};

const sdpConstraints = {
  OfferToReceiveAudio: false,
  OfferToReceiveVideo: false
};

const shareScreenConstance = {
  video: {
    cursor: "always"
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true
  }
}

const constraints = function (opt = {}) {
  const a = {
    audio: true,
    video: true,
  }
  return a;
};

const size = {
  width: 640,
  height: 574
};

module.exports = { configuration, constraints, size, shareScreenConstance, sdpConstraints };
