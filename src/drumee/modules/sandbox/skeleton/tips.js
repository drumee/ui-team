const _defaultText = `Instead of HTML rendered on server side, LETC uses JSON to locally \
build you web page! <br> \
This demo is just a nano glimpse of what LETC can do for you. <br> \
Note for the ones that come here for some trials. You can edit LETC using left pane.<br> \
After changes, click on 'Run' to see results on the right pane. <br> \
LETC needs essentially two attributes : \
<li> <u>kind</u> to tell what kind of object use want to use</li> \
<li> <u>styleOpt</u> to set set css properies \
<li> <u>attributes</u> optionnaly to set attributes such as <u>id</u>, <u>href</u>, etc.\
`;


const __sandbox_tips = function (_ui_) {
  return Skeletons.Box.X({
    sys_pn: "tips",
    className: `${_ui_.fig.name}-tips`,
    kids: [Skeletons.Note({
      className: "tips",
      content: _defaultText,
    })]
  });
};

module.exports = __sandbox_tips;
