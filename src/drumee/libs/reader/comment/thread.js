class comment_thread extends Marionette.CollectionView {
  constructor(...args) {
    super(...args);
    this.onCommentPost = this.onCommentPost.bind(this);
    this.onCommentDeleted = this.onCommentDeleted.bind(this);
  }

  static initClass() {
    this.prototype.className ="comment-list";
    this.prototype.childView = WPP.Comment.Item;
    this.prototype.childViewContainer = _K.tag.ul;
    this.prototype.childViewEventPrefix = _a.comment;
    this.prototype.emptyView  = LetcBlank;
    this.prototype.tagName = _K.tag.ul;
    behaviorSet({
      bhv_scroll : _K.string.empty});
  }
// ========================
//
// ========================

// ===========================================================
// onCommentPost
//
// @param [Object] child
//
// ===========================================================
  onCommentPost(child) {
    return this.render();
  }
// ========================
//
// ========================

// ===========================================================
// onCommentDeleted
//
// @param [Object] child
//
// ===========================================================
  onCommentDeleted(child) {
    _dbg(">>nnnn LISTSTST onMediaDeleted", child);
    //#child.$el.addClass _C.transition.all

// ===========================================================
// _anim
//
// ===========================================================
    const _anim = () => {
      return child.$el.css({background:'#333', opacity:0});
    };
    _.delay(_anim, 1);

// ===========================================================
// _remove
//
// ===========================================================
    const _remove = () => {
      return this.collection.remove(child.model);
    };
    return _.delay(_remove, 600);
  }
}
comment_thread.initClass();
module.exports = comment_thread;
