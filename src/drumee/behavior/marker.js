

//  -- DEPRECATED USED
class __bhv_marker extends Marionette.Behavior {
// =================================== *
//
// =================================== *

// ===========================================================
// getTextNodesIn
//
// @param [Object] node
//
// @return [Object] 
//
// ===========================================================
  getTextNodesIn(node){
    const textNodes = [];
    if (node.nodeType === 3) {
      textNodes.push(node);
    } else {
      for (var c of Array.from(node.childNodes)) {
        textNodes.push.apply(textNodes, this.getTextNodesIn(c));
      }
    }
    return textNodes;
  }
// =================================== *
//
// =================================== *

// ===========================================================
// setSelectionRange
//
// @param [Object] el
// @param [Object] start
// @param [Object] end
//
// ===========================================================
  setSelectionRange(el, start, end){
    if (document.createRange && window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const textNodes = this.getTextNodesIn(el);
      let foundStart = false;
      let charCount = 0;
      let i = 0;
      for (var textNode of Array.from(textNodes)) {
        var endCharCount = charCount + textNode.length;
        var c1 = ((start === endCharCount) && (i <= textNodes.length));
        i++;
        if (!foundStart && (start >= charCount) && ((start < endCharCount) || c1)) {
          range.setStart(textNode, start - charCount);
          foundStart = true;
        }
        if (foundStart && (end <= endCharCount)) {
          range.setEnd(textNode, end - charCount);
          break;
        }
        charCount = endCharCount;
      }
      const sel = window.getSelection();
      sel.removeAllRanges();
      return sel.addRange(range);
    } else if (document.selection && document.body.createTextRange) {
      const textRange = document.body.createTextRange();
      textRange.moveToElementText(el);
      textRange.collapse(true);
      textRange.moveEnd("character", end);
      textRange.moveStart("character", start);
      return textRange.select();
    }
  }
// =================================== *
//
// =================================== *

// ===========================================================
// mark
//
// @param [Object] colour
//
// ===========================================================
  mark(colour){
    let range;
    const sel = window.getSelection();
    if (sel.rangeCount && sel.getRangeAt) {
        range = sel.getRangeAt(0);
      }
    document.designMode = _a.on;
    if (range != null) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    //Use HiliteColor since some browsers apply BackColor to the whole block
    if (!document.execCommand("HiliteColor", false, colour)) {
        document.execCommand("BackColor", false, colour);
      }
    return document.designMode = _a.off;
  }
// =================================== *
//
// =================================== *

// ===========================================================
// #  highlight
//
// @param [Object] colour
//
// ===========================================================
//  highlight:(colour)->
//     if (!document.execCommand("BackColor", false, colour))
//       @makeEditableAndHighlight(colour)
//    if (window.getSelection)
//      # IE9 and non-IE
//      try
//        if (!document.execCommand("BackColor", false, colour))
//          @makeEditableAndHighlight(colour)
//      finally
//        @makeEditableAndHighlight(colour)
//    else if (document.selection && document.selection.createRange)
//      # IE <= 8 case
//      range = document.selection.createRange()
//      range.execCommand("BackColor", false, colour)
// =================================== *
//
// =================================== *

// ===========================================================
// onMark
//
// @param [Object] start
// @param [Object] end
// @param [Object] colour=null
//
// ===========================================================
  onMark(start, end, colour=null){
    const el = this.$el.find('.note-content')[0];
    this.debug("setSelectionRange", this.$el[0]);
    this.setSelectionRange(el, start, end);
    if (colour) {
      if (!document.execCommand("BackColor", false, colour)) {
        //@mark(colour)
        return this.debug("setSelectionRange", this.$el[0]);
      }
    }
  }
}
module.exports = __bhv_marker;
