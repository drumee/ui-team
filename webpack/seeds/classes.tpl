/* ================================================================== *
#   Copyright Xialia.com  2011-<%= year %>
#   FILE : <%= filename %>
#   TYPE : Automatic generation - DO NOT EDIT 
# ===================================================================**/
// @ts-nocheck


// On demand Classes cannot be overloaded

const a = {<% _.each(items, function(item, key, val){ %>
  <%= item.kind %>:<%= item.func %>,<% }) %>
}


function get (name) {
  if(a[name]) return new Promise(a[name]);
  return null;
};
  
module.exports = {get};