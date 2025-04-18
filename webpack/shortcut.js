const shortcuts = {
  '$': "jquery",
  '_': "lodash",
  'jQuery': "jquery",
  'Backbone': "backbone",
  'Marionette': "backbone.marionette",

  // ------------------- Drumee's proxies -------------------
  'PROXY_BACKTRACK': "libs/proxy/backtrack",
  'PROXY_CORE': "proxy",
  'PROXY_BOX': "libs/proxy/box",
  'PROXY_DESK': "libs/proxy/desk",
  'PROXY_TEXT': "libs/proxy/text",
  'PROXY_TOPIC': "libs/proxy/topic",

  // ------------------- Vendors imports -------------------
  'VENDOR_SELECTION': "vendor/libs/selection.min",
  'VENDOR_RESIZESENSOR': "vendor/libs/ResizeSensor",


  // ------------------- Letc's objects / reader -------------------
  'LetcBlank': "reader/blank",
  'LetcBox': "reader/box",
  'LetcList': "reader/list/stream",
  'LetcText': "reader/note",
  'LetcSocket': "socket",
  // ------------------- Letc's objects / writer -------------------
  'LetcWriterBox': "designer/box",
  'LetcWriterSection': "designer/section",


  // ------------------- Drumee's plggins / Skeleton  -------------------
  'SKL_Box_H': "skeleton/box/horizontal",
  'SKL_Box_V': "skeleton/box/vertical",
  'SKL_Scroll_List': "skeleton/box/scroll",
  //'SKL_Scroll_List'   : "skeleton/box/smart-scroll",
  'SKL_Button': "skeleton/button/entry",
  'SKL_Button_Anchor': "skeleton/button/anchor",
  'SKL_Button_Box': "skeleton/button/box",
  'SKL_BUTTON_ICON': "skeleton/button/icon",
  'SKL_Button_Nested': "skeleton/button/nested",
  'SKL_Button_Toggle': 'skeleton/button/toggle',
  'SKL_Btn_Toggle': 'skeleton/button/toggle-v2',
  'SKL_Button_Trigger': "skeleton/button/trigger",
  'SKL_Button_TriggerMini': "skeleton/button/trigger-mini",
  'SKL_Confirm': 'skeleton/confirm',
  'SKL_Dropdown': "skeleton/button/dropdown",
  //'SKL_Entry_Hidden'  : "skeleton/entry/hidden",
  'SKL_Entry_Text': "skeleton/entry",
  'SKL_Entry': "skeleton/entry",
  //'SKL_Entry_Textarea'  : "skeleton/entry/textarea",
  'SKL_FileSelector': 'skeleton/file-selector',
  'SKL_Form_H': 'skeleton/form/horizontal',
  'SKL_Form_V': 'skeleton/form/vertical',
  'SKL_ICON': "skeleton/icon",
  'SKL_Menu_H': 'skeleton/menu/horizontal',
  'SKL_Menu_V': 'skeleton/menu/vertical',
  'SKL_Menu_Topic_V': 'skeleton/menu/topic-v',
  'SKL_Menu_Wrapper': 'skeleton/menu/wrapper',
  'SKL_Note': 'skeleton/note',
  'SKL_NOTE': 'skeleton/note',
  'SKL_Note_Toggle': 'skeleton/note-toggle', // Hybride
  'SKL_Popup': 'skeleton/popup',
  'SKL_Slidebar_Input': 'skeleton/slidebar-input',
  'SKL_Slidebar': 'skeleton/slidebar',
  'SKL_SVG': 'skeleton/svg',
  'SKL_SVG_LABEL': 'skeleton/svg-label',
  'SKL_SVG_RAW': 'skeleton/svg-raw',
  'SKL_Tick_Box': 'skeleton/tick-box/button',
  'SKL_Ticker': 'skeleton/ticker',
  'SKL_UploadProgress': 'skeleton/upload-progress',
  'SKL_Upload_Progress': 'skeleton/box/progress',  // SHALL BE OBSOLETED, replaced by SKL_UploadProgress
  'SKL_Wrapper': 'skeleton/wrapper',
  'WPP.Animation': "behavior/anim",
  'WPP.Behavior': "behavior",
  'WPP_Button': "reader/button",
  'WPP.Button.Blank': "reader/ui/button/blank",
  'WPP.Button.Nested': "reader/ui/button/nested",
  'WPP.Button.Trigger': "reader/ui/button/trigger",
  'WPP.Button.Toggle': "reader/ui/button/toggle",
  'WPP.Comment.Item': "reader/comment/item",
  'WPP.Comment.Thread': "reader/comment/thread",
  'WPP.Composite.Box': "reader/composite",
  'WPP.Container': "reader/container",
  'WPP.Checkbox': "reader/ui/checkbox",
  'WPP.Tickbox': "reader/ui/tickbox",
  'WPP.Box.Designer': "designer/box",
  'WPP_Bem': "reader/bem",
  'WPP_Box_Reader': "reader/box",
  'WPP.Entry.Base': "reader/ui/entry",
  'WPP.Entry.Text': "reader/ui/entry/text",
  'WPP.Form': "reader/form",
  'WPP.History': "builtins/history/handler",
  'WPP.Image.Base': "reader/image",
  'WPP.Image.Box': "reader/image/box",
  'WPP.Image.Slide': "reader/image/slide",
  'WPP.Image.SVG': "reader/image/svg",
  'WPP.Image.Core': "reader/image/core",
  'WPP.Media.Base': "reader/media",
  'WPP.Media.Icon': "reader/media/icon",
  'WPP.Media.Thread': "reader/media/thread",
  'WPP.Media.Video': "reader/media/video",
  'WPP.Menu.Box': "reader/menu/box",
  'WPP.Menu': "reader/menu",
  'WPP.Note': "reader/note",
  'WPP_Note': "reader/note",
  'WPP.Pipe': "socket/pipe",
  'WPP.RSS.Item': "reader/rss/item",
  'WPP.RSS.Thread': "reader/rss/thread",
  'WPP.Room': "widget/room",
  'WPP.Section': 'reader/section',
  'WPP.Select': 'reader/select',
  'WPP.Selector.Media': 'reader/selector/media',
  'WPP.Service': "socket/service",
  'WPP.Spinner.Jump': 'widget/spinner/jump',
  'WPP.Spinner.Lines': 'widget/spinner/lines',
  'WPP.Socket': "socket",
  'WPP_SVG_PATH': "reader/svg/path",
  'WPP.Text.Box': "reader/text/box",
  'WPP.Twit.Item': "reader/twitter/item",
  'WPP.Twit.Thread': "reader/twitter/thread",
  'WPP.Video.Background': "reader/video/background",
  'WPP.Video.Box': "reader/video/box",
  'WPP.Video.Jwplayer': "reader/video/jwplayer",
  'WPP.Wrapper': "wrapper",

  'WPP_Entry': "reader/ui/entry",

}


module.exports = function (webpack) {
  return new webpack.ProvidePlugin(shortcuts);
}