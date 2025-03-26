// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/lex/class
//   TYPE : 
// ==================================================================== *

const a = {
  absolute      : 'absolute',
  active        : 'active',
  bg            : {
    white       : 'bg-white',
    grey        : 'bg-grey'
  },
  box_shadow    : 'box-shadow',
  full          : 'full',
  full_height   : 'full-height',
  full_width    : 'full-width',
  fill_up       : 'fill-up',
  flow          : {
    root        : 'flow-root',
    horizontal  : 'flow-h',
    vertical    : 'flow-v',
    x           : 'flow-h',
    y           : 'flow-v',
    H           : 'flow-h full-width',
    V           : 'flow-v full-width',
    fullH       : 'flow-h full-width',
    fullV       : 'flow-v full-width'
  },
  flexgrid      : 'flexgrid-1',
  flexgrid2     : 'flexgrid-2',
  hidden        : 'hidden',
  margin        : {
    base        : 'margin-5',
    auto        : 'margin-auto',
    auto_v      : 'margin-auto-v',
    auto_h      : 'margin-auto-h',
    left        : {
      px5       : 'margin-left-5',
      px10      : 'margin-left-10'
    }
  },
  node          : 'node',
  no_view       : 'no-view',
  widget        : 'widget',
  helper        : 'helper',
  spinner       : "drumee-spinner"
};
const b = {};
module.exports = {
  _class : a,
  _style : b
};
