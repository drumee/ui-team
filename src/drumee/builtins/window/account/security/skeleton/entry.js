function __security_entry(_ui_, opt) {

  if (opt == null) { opt = {}; }
  const pfx = 'entry';
  const input = Skeletons.EntryBox({
    className: `${_ui_.fig.group}-${pfx}__entry`,
    placeholder: opt.label,
    type: opt.type,
    require: opt.require,
    sys_pn: 'ref-input',
    mode: opt.mode || _a.interactive,
    autocomplete: _a.off,
    preselect: 1,
    uiHandler: _ui_,
    service: opt.service || _e.set,
    formItem: 'name',
    value: opt.value || _ui_.mget(_a.value),
    shower: opt.shower,
    formcomplete: _a.off,
    name: opt.name || _a.password
  });


  const ok = Skeletons.Note({
    className: `${_ui_.fig.group}-${pfx}__button btn--go`,
    content: 'Ok',
    sys_pn: 'ref-button',
    flow: _a.y,
    service: opt.service || _e.set,
    uiHandler: _ui_,
    state: opt.state || 1,
    status: _e.commit
  });


  let entries = Skeletons.Box.X({
    className: `${_ui_.fig.group}-${pfx}__input`,
    kids: [input, ok]
  });


  if (opt.name === _a.phone) {
    let _areaCode = opt.areacode || _ui_.mget(_a.areacode);
    _areaCode = (_areaCode != null ? _areaCode.replace('+', '') : undefined) || '';

    entries = Skeletons.Box.X({
      className: `${_ui_.fig.group}-${pfx}__input mobile`,
      kids: [
        Skeletons.Note({
          className: `${_ui_.fig.group}-${pfx}__note areacode`,
          content: '+'
        }),

        Skeletons.EntryBox({
          className: `${_ui_.fig.group}-${pfx}__entry areacode`,
          sys_pn: 'ref-areacode',
          placeholder: _a.area,
          type: opt.type,
          require: opt.require,
          mode: opt.mode || _a.interactive,
          value: _areaCode,
          name: _a.areacode,
          autocomplete: _a.off,
          uiHandler: _ui_
        }),

        input,
        ok
      ]
    });
  }

  if (opt.passmeter) {
    entries.kids.push(Skeletons.Box.X({
      className: `${_ui_.fig.group}__pw-meter wrapper`,
      kids: [
        Skeletons.Element({
          className: `${_ui_.fig.group}__pw-meter strength`,
          sys_pn: 'ref-pwm'
        })
      ]
    }));
  }

  if (opt.secret) {
    entries.kids.push(Skeletons.Box.X({
      className: `${_ui_.fig.group}__otp wrapper`,
      kids: [
        Skeletons.Note({
          className: `${_ui_.fig.group}-${pfx}__button btn--go`,
          content: LOCALE.RESEND,
          sys_pn: 'ref-resend',
          service: 'resend',
          uiHandler: _ui_
        })
      ]
    }));
  }

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.group}-${pfx}__main`,
    debug: __filename,
    kids: [
      Preset.Button.Close(_ui_),
      entries
    ]
  });

  if (opt.title) {
    const title = Skeletons.Box.X({
      className: `${_ui_.fig.group}-${pfx}__title`,
      kids: [
        Skeletons.Note({
          className: `${_ui_.fig.group}-${pfx}__title-text`,
          content: opt.title
        })
      ]
    });
    a.kids.unshift(title);
  }
  return a;
};

module.exports = __security_entry;
