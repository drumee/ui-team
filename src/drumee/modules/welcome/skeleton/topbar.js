
const { toggleState } = require("core/utils");
function __skl_welcome_topbar(_ui_) {
  let { user_domain, main_domain } = bootstrap();
  let logo = require("assets/mascot.png").default;
  let href = null;
  if (main_domain) href = `https://${main_domain}`;
  const a = Skeletons.Box.Z({
    debug: __filename,
    className: `${_ui_.fig.group}__topbar u-jc-sb`,
    kids: [
      Skeletons.Box.Y({
        className: `${_ui_.fig.group}__topbar-logo`,
        href,
        kids: [
          {
            kind: 'custom_logo',
            label: 'Ultimate cloud technology'
          }
        ]
      })
    ]
  });

  return a;
};

export default __skl_welcome_topbar;
