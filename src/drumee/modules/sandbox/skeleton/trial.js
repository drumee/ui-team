const __sandbox_trial = function (ui) {
  let tips = {
    kind: KIND.note,
    className: "item-tips",
    content: "Try to plug in your own work here. See example in #10"
  };
  tips = keletons.Box.Y({
    className: "sandbox--radio",
    kids: [tips]
  });
  const ll = {
    styleOpt: {
      left: 0,
      top: 0,
      height: window.innerHeight - 100,
      width: "100%",
      border: "1px solid green"
    },
    creator: `https://your.snippet.code/someshere`,
    snippets: [{
      style: {
        rel: "stylesheet",
        href: `https://some.open.source/style.css`,
        crossorigin: ""
      }
    }, {
      script: {
        src: `https://some.open.source/code.js`,
        crossorigin: ""
      }
    }],
    vendors: [{
      link: {
        rel: "stylesheet",
        href: `https://some.open.source/style.css`,
        params: "some parameter",
        crossorigin: ""
      }
    }, {
      script: {
        src: `https://some.open.source/code.js`,
        params: "some parameter",
        crossorigin: ""
      }
    }]
  };
  const a = SKL_Box_V(ui, {
    kids: [tips, ll]
  });
  return a;
};
module.exports = __sandbox_trial;
