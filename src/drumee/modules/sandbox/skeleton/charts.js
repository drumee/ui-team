// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/prebuilt
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const __sandbox_prebuilt = function (view) {
  const section = {
    kind: 'chart_pie',
    header: {
      title: {
        text: "People favorite colors",
        fontSize: 17,
        font: "Roboto-Light,sans-serif",
        color: "black"
      },
      location: "pie-center"
    },
    content: [{
      label: "Royal blue",
      value: 27,
      color: "royalBlue"
    }, {
      label: "Lime green",
      value: 35,
      color: "limegreen"
    }, {
      label: "Hot pink",
      value: 30,
      color: "hotpink"
    }],
    labels: {
      mainLabel: {
        fontSize: 12,
        color: "black",
        font: "Roboto-Light,sans-serif"
      }
    },
    styleOpt: {
      height: 400,
      width: 400
    }
  };
  const a = Skeletons.Box.Y({
    className: "sandbox--wrapper",
    tips: "Chart need mainly data, which can static or REST API",
    kids: [section]
  });

  return a;
};
module.exports = __sandbox_prebuilt;
