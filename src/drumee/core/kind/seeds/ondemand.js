/* ================================================================== *
#   Copyright Thidima SA  2011-2025
#   FILE : /src/drumee/core/kind/seeds/builtins.js
#   TYPE : Automatic generation - DO NOT EDIT 
# ===================================================================**/
// @ts-nocheck


module.exports = {
  datepicker: function (s, f) { import('libs/reader/datepicker').then(m => { s(m.default) }).catch(f) },
  iframe: function (s, f) { import('libs/reader/iframe').then(m => { s(m.default) }).catch(f) },
} ;
