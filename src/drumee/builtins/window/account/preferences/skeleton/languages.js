const CHANGE_LANG = 'change-lang';

const __account_languages = function (_ui_) {
  const { static } = bootstrap();
  const a = Skeletons.List.Smart({
    debug: __filename,
    className: `${_ui_.fig.family}__language-list`,
    sys_pn: "roll-language",
    vendorOpt: Preset.List.Orange_e,
    kids: Array.from(Platform.get('intl')).map((l) =>
      Skeletons.Button.Label({
        ico: "common_placeholder",
        className: `${_ui_.fig.family}__language-item`,
        label: LOCALE[l],
        value: l,
        service: CHANGE_LANG,
        uiHandler: [_ui_],
        svgSource: `${static}images/flags/languages_${l}.svg`
      }))
  });

  return a;
};

module.exports = __account_languages;
