// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/text
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const countdown_timer = function(){
  const a = { 
    kind: "countdown_timer",
    in: 10,
    tips: "Shall trigger a service upon expiry",
    service:"boooooom",
    styleOpt : {
      padding: 30,
      marging: 20,
      width: 300,
      height:170
    }
  };
  return a;
};
module.exports = countdown_timer;
