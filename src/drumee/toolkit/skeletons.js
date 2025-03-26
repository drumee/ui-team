// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/toolkits/skeletons
//   TYPE : Generator
// ==================================================================== *

module.exports = {
  Avatar     : require("./skeleton/avatar"),

  Box        : {
    G        : require("./skeleton/box-g"),
    X        : require("./skeleton/box-x"),
    Y        : require("./skeleton/box-y"),
    Z        : require("./skeleton/box-z")
  },

  Button     : {
    Icon     : require("./skeleton/button/icon"),
    Label    : require("./skeleton/button/label"),
    Svg      : require("./skeleton/button/svg")
  },

  Element    : require("./skeleton/element"),

  Factory    : require("./skeleton/factory"),

  FileSelector    : require("./skeleton/file-selector"),

  Entry      : require("./skeleton/entry/input"),
  EntryBox   : require("./skeleton/entry/reminder"),

  Image      : { 
    Smart    : require("./skeleton/image/smart"),
    Svg      : require("./skeleton/image/svg")
  },
    
  List       : {
    Scroll   : require("./skeleton/list/smart"),
    Smart    : require("./skeleton/list/smart"),
    Table    : require("./skeleton/list/table")
  },

  Messenger  : require("./skeleton/messenger"),
  Note       : require("./skeleton/note"),
  Profile    : require("./skeleton/profile"),
  Progress   : require("./skeleton/progress"),
  RichText   : require("./skeleton/rich-text"),
  Switch     : require("./skeleton/switch"),
  Switcher   : require("./skeleton/switcher"),
  Textarea   : require("./skeleton/entry/textarea"),
  UserProfile: require("./skeleton/profile"),
  Wrapper    : { 
    X        : require("./skeleton/wrapper-x"),
    Y        : require("./skeleton/wrapper-y")
  },

  Window     : {
    Main     : require('builtins/window/skeleton/topbar/main'),
    Topbar   : require('builtins/window/skeleton/topbar/main'),
    TopbarControl   : require('builtins/window/skeleton/topbar/control')
  }
};
  