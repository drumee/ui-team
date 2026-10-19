const { events:JEVENTS } = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');
const __stream = require("builtins/webrtc/endpoint");
const { watchRemoteScreen } = require("builtins/webrtc/remote-screen-watch");
class __remote_display extends __stream {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.mset({
      label:
        this.mget(_a.firstname) ||
        this.mget(_a.fullname) ||
        this.mget(_a.username),
    });
    this._handshake = 0;
    this.timer = null;
    this.screenShareStatus = "nothing";
    this.track = opt.track;
    this.room = opt.room;
    if (!this.track || !this.room) {
      this.warn("AAA:44 track and room are required");
      return;
    }

    this.onTrackMuteChange = this.onTrackMuteChange.bind(this);
    this.localUserId = this.room.myUserId();
    this.room.on(JEVENTS.conference.TRACK_MUTE_CHANGED, this.onTrackMuteChange);
  }

  /**
   *
   */
  async onBeforeDestroy() {
    if (this._unwatch) {
      this._unwatch();
      this._unwatch = null;
    }
    if (this.track) {
      this.track.detach(this.__video.el);
    }
    this.room.off(JEVENTS.conference.TRACK_MUTE_CHANGED, this.onTrackMuteChange);
    //this.logicalParent.off("TRACK_REMOVED", this.onTrackRemoved);

    this.room = null;
    this.track = null;
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
  }


  /**
   *
   */
  async onDomRefresh() {
    let track = this.track;
    if (!track || !track.isActive()) {
      this.feed(Skeletons.Note("Some errors had occured : NO_TRACK_FOUND"));
      return;
    }
    if(track.getVideoType() == _a.desktop){
      this.feed(require("./skeleton")(this));
    }else{
      this.feed(require("./skeleton/loading")(this));
    }
  }


  /**
   *
   */
  async onTrackMuteChange(track) {
    // Only OUR track, and only on mute — this listener is on the whole
    // conference, and used to tear the screen down for any desktop track,
    // including an unmute.
    if (track !== this.track || !track.isMuted()) return;
    this.triggerHandlers({ service: "stop-remote-screen" });
  }


  /**
   *
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.label:
        this.waitElement(child.el, () => {
          child.spinner(1);
        });
        break;
      case _a.video:
        this.waitElement(child.el, () => {
          this.track.attach(child.el);
          // The viewer's own check on the incoming screen: `ended` clears the
          // stage even if the sharer's stop signal never arrives. A `mute` is
          // deliberately ignored — Chrome's screenshare sends nothing while the
          // content doesn't change, the normal state of a slide or document.
          // See remote-screen-watch.
          if (!this.track.isLocal() && !this._unwatch) {
            const raw = this.track.getTrack ? this.track.getTrack() : this.track.track;
            this._unwatch = watchRemoteScreen(raw, {
              onEnded: () => this.triggerHandlers({ service: "stop-remote-screen" }),
            });
          }
          child.el.onloadeddata = () => {
            // First frame is in — hide the "loading screen" spinner overlay.
            const loader = this.el &&
              this.el.querySelector(`.${this.fig.family}__loading`);
            if (loader) loader.style.display = "none";
            let size = this.track.track.getSettings();
            this.triggerHandlers({ service: "start-remote-screen", size });
          };
        });
    }
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case "togglefullscreen":
        this.triggerHandlers({ service, state: cmd.mget(_a.state) });
        return;
    }
  }
}

module.exports = __remote_display;
