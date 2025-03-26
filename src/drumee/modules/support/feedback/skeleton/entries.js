// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') { 
  __dbg_path = 'admin/locale/skeleton/entries';
}

// ===========================================================
// _form (local-row)
//
// @param [Object] manager
//
// ===========================================================


const __locale_entries = function(manager, data) {
  const a = [
    SKL_Entry(manager, '', {
      className    : "u-ai-center",
      name         : "key_code",
      placeholder  : "key",
      mode : _a.interactive,
      bubble       : 1,
      service      : "lookup-key",
      value        : data.key_code,
      type         : _a.textarea
    }),
    SKL_Entry(manager, '', {
      className    : "u-ai-center",
      name         : "en",
      placeholder  : "en",
      value        : data.en,
      type         : _a.textarea
    }),
    SKL_Entry(manager, '', {
      className    : "u-ai-center",
      name         : "fr",
      placeholder  : "fr",
      value        : data.fr,
      type         : _a.textarea
    }),
    SKL_Entry(manager, '', {
      className    : "u-ai-center",
      name         : "ru",
      value        : data.ru,
      placeholder  : "ru",
      type         : _a.textarea
    }),
    SKL_Entry(manager, '', {
      className    : "u-ai-center",
      name         : "zh",
      value        : data.zh,
      placeholder  : "zh",
      type         : _a.textarea
    })
  ];
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};

module.exports = __locale_entries;



