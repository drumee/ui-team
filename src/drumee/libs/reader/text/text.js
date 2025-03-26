/**
 * 
 * @returns 
 */
export function isBold() {
  const fontWeight = this.getProperty(_a.font.weight) || "400";
  if ((parseInt(fontWeight) > 400) || fontWeight.match(/bold/i)) {
    return 1;
  }
  return 0;
}

/**
 * 
 * @returns 
 */
export function isItalic() {
  const fontStyle = this.getProperty(_a.font.style);
  _dbg("isItalic : ", fontStyle);
  if ((fontStyle != null) && fontStyle.match(/italic/i)) {
    return 1;
  }
  return 0;
}

/**
 * 
 * @returns 
 */
export function isUnderline() {
  const fontDeco = this.getProperty('text-decoration-line');
  _dbg("isUnderline : ", fontDeco);
  if ((fontDeco != null) && fontDeco.match(/underline|solid/i)) {
    return 1;
  }
  return 0;
}

/**
 * 
 * @returns 
 */
export function getLetterSpacing() {
  let value = this.getProperty(_a.letter.spacing);
  if (_.isEmpty(value)) {
    value = 0;
  }
  value = parseFloat(value) || 0;

  let fontSize = this.getProperty(_a.font.size);
  fontSize = parseInt(fontSize) || 6;

  value = value / fontSize;
  value = value.toFixed(2);
  return value;
}

/**
 * 
 * @param {*} string 
 * @returns 
 */
export function capFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
} 

/**
 * 
 * @param {*} prop 
 * @returns 
 */
export function isSelected(prop) {
  const sel = window.getSelection();
  const str = sel.toString();
  if ((prop == null)) {
    return (str.length > 0);
  } else {
    if (str.length > 0) {
      return window.getComputedStyle(sel.focusNode.parentElement)[prop];
    }
  }
  return false;
}

/**
 * 
 * @param {*} prop 
 * @param {*} conv 
 * @param {*} view 
 * @returns 
 */
export function getProperty(prop, conv, view) {
  let el;
  const node = document.getSelection().focusNode;
  if (!node) {
    try {
      view = view || Keeper.currentView();
      ({
        el
      } = view);
    } catch (e) {
      return null;
    }
  } else {
    el = node.parentElement;
  }
  const val = window.getComputedStyle(el)[prop];
  if (_.isFunction(conv)) {
    return conv(val);
  }
  return val;
}

/**
 * 
 * @returns 
 */
export function getSelected() {
  let text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && (document.selection.type !== "Control")) {
    ({
      text
    } = document.selection.createRange());
  }
  return text;
}

