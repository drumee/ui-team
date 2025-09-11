// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/login
//   TYPE : 
// ==================================================================== *

//
//#= extern dui.Letc.Node
//
//dui.module 'Widget', (Widget, xui, Backbone, Marionette, $, _) ->
//  _m = @
//  _c.info "LOADING MODULE"
//
//
//  #####################################
//  # CLASS : Widget.Login
//  # TYPE  : High level widget
//  #####################################
//  class Widget.Login extends Marionette.View
//    templateName: _T.login
//    className:'xia-margin-bottom login-pad'
//    tagName: 'form'
//    regions:
//      spinnerRegion : _REGION.spinner
//      submitRegion  : "#xui-login-btn"
//      formRegion    : "#xui-login-inputs"
//      test          : "#xui-test-region"
//
//    is_running: off
//
//    events:
//      click: '_click'
//
//    behaviorSet
//      bhv_menu: _K.char.empty
//      bhv_spin: _K.char.empty #_K.dummyArgs
//
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    initialize
//
// ===========================================================
//    initialize: () ->
//      opt = dui.request _REQ.ui.form.login
//      @socket = new WPP.Pipe
//        method : _RPC.req.login
//      @socket.addListener @
//      if opt.form?
//        @_formCollection = new dui.Collection.Input(opt.form)
//        @formCollection.on _e.error, @_reset
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    _click
//
// @param [Object] e
//
// ===========================================================
//    _click:(e) =>
//      e.stopPropagation()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onRender
//
// ===========================================================
//    onRender: () =>
//      @submitBtn = new dui.Button.Launch({
//        model: new dui.Model.button({
//          picto:"fa fa-power-off fa-fw",
//          role:'submit'
//        })
//      })
//      @submitBtn.addListener @
//      @_form = new dui.Form.View()
//      @_form.collection.set dui.request(_REQ.ui.form.login)
//      @_form.addListener @
//      a = @getOption _a.align || _a.center
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onDestroy
//
// ===========================================================
//    onDestroy:()=>
//      router.isloging = no
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onDomRefresh
//
// ===========================================================
//    onDomRefresh:()=>
//      _dbg "prompt:onDomRefresh", @submitBtn, @cancelBtn
//      @formRegion.show(@_form)
//      @submitRegion.show(@submitBtn)
//      router.isloging = yes
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    _submit
//
// @return [Object] 
//
// ===========================================================
//    _submit:() =>
//      #_dbg "ZZZZ submit", @is_running, @formCollection, @socket
//      if @is_running
//        return
//      @is_running = yes
//      try
//        args = @_form.toArgs()
//      catch err
//        @_reset()
//        _c.error "Check failed", args, err
//        return
//      _dbg "<<Collection.Input toArgs ==>", args
//      if args?
//        @socket.set args
//        @socket.post()
//      else
//        @_reset()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    _reset
//
// ===========================================================
//    _reset: () =>
//      #_dbg "ZZZZ ==========> onPipeWriteSucceeded"
//      @is_running = no
//      @submitBtn.stop()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onButtonSubmit
//
// ===========================================================
//    onButtonSubmit:()=>
//      @_submit()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onKeypressEnter
//
// ===========================================================
//    onKeypressEnter:()=>
//      #_dbg "qqqonKeypressEnter"
//      @_submit()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onKeypressEscape
//
// ===========================================================
//    onKeypressEscape:()=>
//      #_dbg "onKeypressEscape"
//      @socket.reset()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onValidatorReset
//
// ===========================================================
//    onValidatorReset:()=>
//      #_dbg "onValidatorReset"
//      @socket.reset()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onPipeAborted
//
// ===========================================================
//    onPipeAborted:() =>
//      @_reset()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    isPersistent
//
// @return [Object] 
//
// ===========================================================
//    isPersistent:() =>
//      p = @getOption(_a.persistent) || _a.self
//      return p
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onPipeSucceeded
//
// @param [Object] json
//
// @return [Object] 
//
// ===========================================================
//    onPipeSucceeded:(json) =>
//      @_reset()
//      #hash = (Backbone.history.location.hash).replace(/\#.*/, _K.string.empty)
//      #Backbone.history.navigate(hash)
//      _dbg "LOGGED IN ", json.data.vhost
//
//      # clean up to avoid logout loop
//      hash = location.hash
//      if hash.match(/^\#\!home\/logout/)
//        hash = _K.string.empty
//
//      host = location.host
//      if host.match(/^drumee\.|^home\.|^www\.|^nobody\./)
//        # Go to user's home page
//        if _.isEmpty(hash)
//          href = "#{json.data.vhost}#{location.pathname}"
//        else
//          # Keep the hash on the same host
//          href = "#{host}#{location.pathname}#{hash}"
//          Backbone.history.location.reload()
//          return
//
//      _dbg "LOGGED IN HREF = #{href}"
//      if href?
//        location.href = `${protocol}://#{href}`
//      else
//        Backbone.history.location.reload()
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    onPipeFailed
//
// @param [Object] xhr
//
// ===========================================================
//    onPipeFailed:(xhr) =>
//      @_reset()
