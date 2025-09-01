/* ================================================================== *
#   Copyright Thidima SA  2011-<%= year %>
#   FILE : <%= filename %>
#   TYPE : Automatic generation - DO NOT EDIT 
# ===================================================================**/
// @ts-nocheck


// On demand Classes cannot be overloaded

const builtins = {<% _.each(items, function(item, key, val){ %>
  <%= item.kind %>:<%= item.func %>,<% }) %>
}
  
module.exports = builtins ;