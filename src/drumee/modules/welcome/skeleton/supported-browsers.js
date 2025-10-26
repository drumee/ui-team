
function link(name) {

  let a = {
    brave: `https://brave.com/fr/download/`,
    chrome: `https://www.google.com/intl/fr_fr/chrome/`,
    edge: `https://www.microsoft.com/fr-fr/edge/`,
    firefox: `https://www.mozilla.org/fr/firefox/new/`,
    safari: `https://support.apple.com/downloads/safari`,
    yandex: `https://browser.yandex.com/`,
  }
  return a[name];
}

function add_image_element_row(figFamily, name) {
  const rowContent = `${figFamily}__image-browser`

  const row = Skeletons.Note({
    className: `${rowContent} ${name}`,
    tagName: _K.tag.a,
    styleOpt: {
      background: `url(/-/images/browsers/${name}.png)`,
    },
    attrOpt: {
      // src: `/-/images/browsers/${name}.png`,
      title: `${name}`,
      href: `${link(name)}`
    }
  })

  return row
}

function __router_supported_browsers(_ui_, signal) {

  const pfx = `${_ui_.fig.group}-supported-browsers`;
  let browser = require('detect-browser').detect();
  let [major, minor, rel] = browser.version.split(/\.+/);

  let text = LOCALE.INTRO_POPUP_INFO_MESSAGE;
  let usable = Visitor.canUseBrowser(browser.name);
  if (usable) {
    text = `${usable}`.printf(LOCALE.BROWSER_UNSUPPORTED_VERSION);
  }

  const message = Skeletons.Box.X({
    className: `${pfx}__message`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__note message`,
        content: text
      })
    ]
  })

  const validity = Skeletons.Box.X({
    className: `${pfx}__message validity`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__note message`,
        content: LOCALE.NAVIGATORS_VALIDITY_DATE
      })
    ]
  })

  const browsers = Skeletons.Box.X({
    className: `${pfx}__browsers`,
    kids: [
      add_image_element_row(pfx, 'brave'),
      add_image_element_row(pfx, 'chrome'),
      add_image_element_row(pfx, 'edge'),
      add_image_element_row(pfx, 'firefox'),
      add_image_element_row(pfx, 'safari'),
      add_image_element_row(pfx, 'yandex'),
    ]
  })

  const info = Skeletons.Box.Y({
    className: `${pfx}__info`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__note info skip`,
        content: LOCALE.MY_BROWSER_IS_OK,
        uiHandler: [_ui_],
        signal,
        service: 'skip-browser-check'
      })
    ]
  })

  const browsers_container = Skeletons.Box.Y({
    className: `${pfx}__browsers-container`,
    kids: [
      validity,
      browsers,
    ]

  });

  const a = Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [
      message,
      browsers_container,
      info
    ]
  });

  return a;

};

export default __router_supported_browsers;
