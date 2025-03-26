// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __privacy_login_tt = function(_ui_, txt){
  const a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__popup main`,
    debug       : __filename,
    kids        : [
      Preset.Button.Close(_ui_, "close-popup"),
      Skeletons.Note({
        className : `${_ui_.fig.family}__title blue`,
        content : `联轴历史记录选项” \
\
Skeletons.Note \
className : `,//{_ui_.fig.family}__title black"
        content : "活性"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__text`,
        content : `Drumee会在连接时查看连接位置，并在安全桌面上向您发送历史记录。 这样您就可以查看您的历史记录，并可以检测其他人是否尝试连接。 使用此选项，当看到不正常的连接时（在您不习惯的地方，IP不正常的地方等），Drumee可以向您发送警报。 Drumee仅在您最后20个连接时保留在内存中.” \
\
Skeletons.Note \
className : `,//{_ui_.fig.family}__title black"
        content : `未激活” \
\
Skeletons.Note \
className : `,//{_ui_.fig.family}__text"
        content : "您更喜欢drumee没有建立联系的地点和时间的历史记录。 在这种情况下，您的安全服务台将没有连接历史记录，也不会向您发送警报。"
      })
    ]});
  a.kids;
  return a;
};

module.exports = __privacy_login_tt;
