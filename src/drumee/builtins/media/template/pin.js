// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __media_tpl_pin = (mode, text, icon) => `\
<div class='moving-pin moving-pin__${mode}'> \
<span class=''>${text}</span> \
<svg> \
<use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#--icon-${icon}'></use> \
</svg> \
</div>`;

 

module.exports = __media_tpl_pin;    
