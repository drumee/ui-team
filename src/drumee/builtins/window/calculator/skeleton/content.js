/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

const __skl_calculator_content = (_ui_) => {
  const { fig: { family, group }, calcButtons } = _ui_;
  return Skeletons.Box.Y({
    className: `${family}__main ${family}__content`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${family}__calc-heading`,
        uiHandler: _ui_,
        partHandler: _ui_,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-title`,
            sys_pn: "calc-total",
            uiHandler: _ui_,
            partHandler: _ui_,
            content: ""
          }),
        ]
      }),
      Skeletons.Box.Y({
        className: `${family}__calc-input-block ${group}__calc-input-block`,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-input-ans blink`,
            sys_pn: "calc-input",
            uiHandler: _ui_,
            partHandler: _ui_,
            content: "|"
          }),
        ]
      }),
      ...calcButtons.map((row, index) => Skeletons.Box.X({
        className: `${family}__calc-actions${index === calcButtons.length - 1 ? '__last' : ''} ${group}__calc-actions${index === calcButtons.length - 1 ? '__last' : ''}`,
        kids: row.map(({ className, service, content }) => Skeletons.Note({
          className: `${family}${className}`,
          service: service,
          uiHandler: _ui_,
          partHandler: _ui_,
          content: content
        }))
      }))
    ]
  });
}
export default __skl_calculator_content;