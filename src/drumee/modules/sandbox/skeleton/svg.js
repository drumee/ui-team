// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/svg
//   TYPE :
// ==================================================================== *

const _button1 = function() {
  const a = {
    kind : KIND.svg.path,
    position: "free",
    dataOpt: {
      strokeWidth : 3,
      color : "#6789aa"
    },
    styleOpt: {
      "background-color": "rgba(255, 255, 255, 0.6)",
      "box-shadow": "0 1px 3px 1px rgba(0, 0, 0, 0.17)",
      width   : 250,
      height  : 250,
      left: 50,
      "min-width": 0,
      padding: "8px",
      top: 250
    },
    schemaOpt : {
      stroke           : "{$.color}",
      'stroke-width'   : "{$.strokeWidth}",
      'stroke-linecap' : "round",
      'class'          : 'line-shape',
      'type'           : 'triangle',
      fill             : _a.none,
      filter           : "{$.filter}",
      viewBox          : "0; 0; {$.width}; {$.height}",        
      g : [{
        path: {
          d : "M{$.width/2}; 0; L0; {$.height}; {$.width}; {$.height}; Z",
          'stroke-width' : "{$.strokeWidth}",
          'stroke-dasharray' : "{$.dasharray}",
          stroke         : "{$.color}",
          fill           : "{$.fill}"
        }
      }]
    }
  };
  return a; 
};

const _button2 = function() {
  const a = { 
    kind  : KIND.svg.path,
    dataOpt: {
      strokeWidth : 10,
      color : "red"
    },
    styleOpt: {
      "background-color": "rgba(255, 255, 255, 0.6)",
      "box-shadow": "0 1px 3px 1px rgba(0, 0, 0, 0.17)",
      height: 155,
      left: 50,
      padding: "8px",
      top: 50,
      width: 164
    },
    schemaOpt : {
      'stroke-width'   : "{$.strokeWidth}",
      'stroke-linecap' : "round",
      'class'          : 'line-shape',
      filter           : "{$.filter}",
      g : [{
        line : {
          x1 : 0,
          y1 : "{$.height/2 - $.strokeWidth/2}",
          x2 : "{$.width}",
          y2 : "{$.height/2 - $.strokeWidth/2}",
          'stroke-width' : "{$.strokeWidth}",
          stroke         : "{$.color}",
          'stroke-dasharray' : "{$.dasharray}"
        }
      },{
        circle: {
          cx : "{$.strokeWidth}",
          cy : "{$.height/2 - $.strokeWidth/2}",
          r  : "{$.strokeWidth}",
          fill : "{$.color}"
        }
      },{
        circle: {
          cx : "{$.width - $.strokeWidth}",
          cy : "{$.height/2 - $.strokeWidth/2}",
          r  : "{$.strokeWidth}",
          fill : "{$.color}"
        }
      }]
    }
  };
  return a; 
};


const __sandbox_svg = function(view) {
  const a = Skeletons.Box.Y({
    styleOpt : {
      width : "100%",
      height : "100%"
    },
    tips:`Want to play with svg?. <u>$.*</u> means * come from <u>dataOpt</u>.<br> \
    Change some svg properties.`,
    kids:[ _button1(), _button2()]
  });
  return a;
};

module.exports =  __sandbox_svg;
