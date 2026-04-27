// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/window/channel/
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_meeting = function (_ui_, localUser) {
  const mode = _ui_.mget(_a.mode) || "";
  const area = _ui_.mget(_a.area);
  const role = _ui_.mget(_a.role);

  const body = require('builtins/webrtc/skeleton')(_ui_, localUser);

  const a = Skeletons.Box.Y({
    debug: __filename,
    sys_pn: 'xxcontent',
    className: `${_ui_.fig.family}__main ${mode} ${area} ${role}`,
    kids: [body]
  });

  return a;
};

module.exports = __skl_window_meeting;