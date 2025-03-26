// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
if (__BUILD__ === "dev") {
  const __dbg_path = "welcome/skeleton/signup/pass-phrase";
}

// ==================================
// Inputs definition for signup pad
// ==================================

// ===========================================================
// __pass_tooltips
//
// ===========================================================
const __pass_tooltips = function(_ui_) {

  const a = [
      Skeletons.Note(`\
“Passphrase“ is a phrase with space between words.<br> \
It's stronger than standard pasword and easier to remember.<br> \
You can use any printable characters.\
`, "mt-40 mb-16"),
      Skeletons.Note("Passphrase exemple:", "mb-10"),
      Skeletons.Note("I have two brothers & 2 sisters"),
      Skeletons.Note("Important: never use public sentences.", "mb-16"),
      Skeletons.Note("Create you own passphrase")
    ];

  return a;
};

module.exports = __pass_tooltips;
