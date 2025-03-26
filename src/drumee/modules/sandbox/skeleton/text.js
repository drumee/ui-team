// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/text
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const __sandbox_text = function(){
  const a = { 
    kind: KIND.note,
    content: `Hi! My kind is 'note'. And I'am a text widget! \
You can change any of my CSS proerties through option styleOpt.<br> \
Change this text to what you whant.`,
    styleOpt : {
      padding: 50,
      marging: 20
    }
  };
  return a;
};
module.exports = __sandbox_text;
