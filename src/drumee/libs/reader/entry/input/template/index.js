
const _entry_template = function (ui) {
  let entry, tag;
  const m = ui.model.toJSON();
  const ac = m.autocomplete || m.name;
  let readonly = '';
  if (m.readonly) {
    readonly = 'readonly';
  }
  if (m.type === _a.textarea) {
    tag = _a.textarea;
    entry = `
      <${tag} id="${m.widgetId}-input" type="${m.type}"  ${readonly} 
      class="${m.inputClass} widget inner note-input" rows="${m.rows}" cols="${m.cols}" 
      placeholder="${m.placeholder}" name="${m.name}" autocomplete="${ac}" 
      value="${m.value}">
    `;
  } else {
    tag = _a.input;
    let minmax = ''
    if (m.type === _a.number) {
      if (/^[0-9]+$/.test(m.min)) {
        minmax = `min="${m.min}"`
      }
      if (/^[0-9]+$/.test(m.max)) {
        minmax = `${minmax} max="${m.max}"`
      }
    }
    entry = `
      <${tag} id="${m.widgetId}-input" type="${m.type}" 
      class="${m.inputClass} inner note-input" 
      placeholder="${m.placeholder}" name="${m.name}" autocomplete="${ac}" 
      value="${m.value}" minlength="${m.minlength}" maxlength="${m.maxlength}" 
      ${minmax} ${readonly}>
    `;
    if (m.formcomplete && (m.formcomplete === _a.off)) {
      entry = `<form autocomplete='${m.formcomplete}'>${entry}</form>`;
    }
  }

  const label = `
    <div id="${m.widgetId}-label" class="${m.labelClass} entry-label"> 
    <section class="root-node">${m.label}</section> 
    </div>
  `;
  return label + entry;
};
module.exports = _entry_template;
