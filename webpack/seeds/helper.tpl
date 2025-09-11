/* ================================================================== *
#   Copyright Thidima SA  2011-<%= year %>
#   FILE : <%= filename %>
#   TYPE : Automatic generation - DO NOT EDIT 
# ===================================================================**/
// @ts-nocheck

const STYLE = "color: green; font-weight: bold;"
// Kind Helper. Only for devel usage. List available kinds

const a = {<% _.each(items, function(item, key, val){ %>
  <%= item.kind %>:"<%= item.path %>",<% }) %>
}

/**
  @param string name
*/
function list (name) {
  if(a[name]) return a[name];
  let keys = _.keys(a)
  if(name){
    keys = keys.filter((k)=>{
      return(new RegExp(name).test(k))
    })
  }
  for (let i of keys ){
    console.log(i + " -> " + "%c" + a[i], STYLE)
  }
  return keys
};
  
module.exports = {list};