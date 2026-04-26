module.exports = {
  activity_item: function () {
    return import("./builtins/panel/activity/widget/item");
  },
  panel_activity: function () {
    return import("./builtins/panel/activity");
  },
  panel_activity_item: function () {
    return import("./builtins/panel/activity/item");
  },
  addressbook_widget_notification: function () {
    return import("./builtins/window/addressbook/widget/notification");
  },
  admin_main: function () {
    return import("./builtins/panel/admin");
  },
  admin_members: function () {
    return import("./builtins/panel/admin/members");
  },
  admin_members_item: function () {
    return import("./builtins/panel/admin/members/item");
  },
  admin_rules: function () {
    return import("./builtins/panel/admin/rules");
  },
  admin_permissions: function () {
    return import("./builtins/panel/admin/permissions");
  },
  admin_roles: function () {
    return import("./builtins/panel/admin/role");
  },
  admin_roles_request: function () {
    return import("./builtins/panel/admin/role/item");
  },
  admin_security: function () {
    return import("./builtins/panel/admin/security");
  },
  admin_security_workspace: function () {
    return import("./builtins/panel/admin/security/item");
  },
  admin_security_page: function () {
    return import("./builtins/window/adminpanel/pages/admin-security");
  },
  admin_log: function () {
    return import("./builtins/panel/admin/log");
  },
  admin_log_item: function () {
    return import("./builtins/panel/admin/log/item");
  },
  admin_storage: function () {
    return import("./builtins/panel/admin/storage");
  },
  admin_storage_file: function () {
    return import("./builtins/panel/admin/storage/item");
  },
  admin_storage_user: function () {
    return import("./builtins/panel/admin/storage/user");
  },
  audio_player: function () {
    return import("./builtins/player/audio");
  },
  bigchat_widget_notification: function () {
    return import("./builtins/window/bigchat/widget/notification");
  },
  chat_p2p_widget_notification: function () {
    return import("./builtins/widget/chat-p2p-notification");
  },
  broadcast_message_page: function () {
    return import("./builtins/window/adminpanel/pages/broadcast-message");
  },
  butler: function () {
    return import("router/butler");
  },
  chat_contact_item: function () {
    return import("./builtins/window/bigchat/widget/chatcontact-item");
  },
  chat_contact_list: function () {
    return import("./builtins/window/bigchat/widget/chatcontact-list");
  },
  chat_p2p: function () {
    return import("./builtins/widget/chat-p2p");
  },
  chat_room: function () {
    return import("./builtins/window/bigchat/widget/chat-room");
  },
  contact_form_items: function () {
    return import("./builtins/window/addressbook/widget/contact-form-items");
  },
  contact_invitation_form: function () {
    return import("widget/contact-invitation-form");
  },
  contact_item: function () {
    return import("./builtins/window/addressbook/widget/contact-item");
  },
  countdown_timer: function () {
    return import("./builtins/widget/countdown/index");
  },
  custom_logo: function () {
    return import("./builtins/widget/logo");
  },
  devel_icons: function () {
    return import("./modules/devel/icons");
  },
  devices_settings: function () {
    return import("./builtins/widget/devices");
  },
  disk_usage: function () {
    return import("widget/disk-usage");
  },
  dmz_meeting: function () {
    return import("./modules/dmz/meeting");
  },
  dmz_sharebox: function () {
    return import("./modules/dmz/sharebox");
  },
  dmz_window_manager: function () {
    return import("./modules/dmz/wm");
  },
  desk_breadcrumb: function () {
    return import("./modules/desk/breadcrumb");
  },
  desk_breadcrumb_item: function () {
    return import("./modules/desk/breadcrumb/item");
  },
  workspace_item: function () {
    return import("./modules/desk/workspace-item");
  },
  workspace_list: function () {
    return import("./modules/desk/workspace-list");
  },
  dock: function () {
    return import("./modules/desk/wm/dock");
  },
  document_page: function () {
    return import("./builtins/player/document/page");
  },
  document_reader: function () {
    return import("./builtins/player/document");
  },
  domain_page: function () {
    return import("./builtins/window/adminpanel/pages/domain-page");
  },
  drumee_background: function () {
    return import("./builtins/widget/background-image");
  },
  editor_json: function () {
    return import("editor/json");
  },
  editor_markdown: function () {
    return import("./builtins/editor/markdow");
  },
  email_input_item: function () {
    return import("./builtins/widget/email-input-item/index");
  },
  image_viewer: function () {
    return import("./builtins/player/image");
  },
  locale_language: function () {
    return import("./modules/devel/locale/language");
  },
  locale: function () {
    return import("./modules/devel/locale/index");
  },
  media_efs: function () {
    return import("./builtins/window/serverexplorer/widget/efs");
  },
  media_form: function () {
    return import("./builtins/media/form");
  },
  folder_form: function () {
    return import("./builtins/media/folder-form");
  },
  tasks_panel: function () {
    return import("./builtins/window/tasks");
  },
  media_grid: function () {
    return import("./builtins/media/grid");
  },
  media_notifications: function () {
    return import("./builtins/media/notifications");
  },
  media_origin: function () {
    return import("./builtins/media/notifications/origin");
  },
  media_paste: function () {
    return import("./builtins/media/paste");
  },
  media_preview: function () {
    return import("./builtins/media/preview");
  },
  media_pseudo: function () {
    return import("./builtins/media/pseudo");
  },
  media_row: function () {
    return import("./builtins/media/row");
  },
  media_simple: function () {
    return import("./builtins/media/simple");
  },
  media_uploader: function () {
    return import("./builtins/media/uploader");
  },
  media_wrapper: function () {
    return import("./builtins/window/channel/media-wrapper");
  },
  media: function () {
    return import("./builtins/media/grid");
  },
  members_page: function () {
    return import("./builtins/window/adminpanel/pages/members");
  },
  members_room: function () {
    return import("./builtins/window/adminpanel/pages/members/room");
  },
  menu_input: function () {
    return import("./builtins/widget/menu-input");
  },
  messenger: function () {
    return import("./builtins/messenger");
  },
  module_desk: function () {
    return import("./modules/desk");
  },
  module_devel: function () {
    return import("./modules/devel");
  },
  module_dmz: function () {
    return import("./modules/dmz");
  },
  module_plugins: function () {
    return import("./modules/plugins");
  },
  module_sandbox: function () {
    return import("./modules/sandbox");
  },
  module_welcome: function () {
    return import("./modules/welcome");
  },
  notification_file: function () {
    return import("./builtins/media/notifications/origin/file");
  },
  notification_message: function () {
    return import("./builtins/media/notifications/origin/message");
  },
  notifier_generic: function () {
    return import("desk/notifier/generic");
  },
  notifier_network: function () {
    return import("desk/notifier/network");
  },
  organization_form: function () {
    return import("./builtins/widget/settings/organization/form");
  },
  permission_restricted: function () {
    return import("./builtins/permission/restricted");
  },
  permission_shared: function () {
    return import("./builtins/permission/share");
  },
  schedule_invitation: function () {
    return import("./builtins/window/schedule/widget/invitation");
  },
  schedule_recipient: function () {
    return import("./builtins/window/schedule/widget/recipient");
  },
  selection: function () {
    return import("./builtins/window/selection");
  },
  settings_account: function () {
    return import("widget/settings/account");
  },
  settings_activity_hub_item: function () {
    return import("widget/settings/activity-hub/item");
  },
  settings_activity_hub: function () {
    return import("widget/settings/activity-hub");
  },
  settings_billing: function () {
    return import("widget/settings/account/billing");
  },
  settings_main: function () {
    return import("widget/settings/main");
  },
  settings_delete_account: function () {
    return import("widget/settings/delete-account");
  },
  apps_main: function () {
    return import("widget/apps/main");
  },
  settings_filename: function () {
    return import("widget/settings/filename");
  },
  settings_folder: function () {
    return import("widget/settings/folder");
  },
  settings_helpcenter: function () {
    return import("widget/settings/helpcenter");
  },
  // settings_hub: function () {
  //   return import("widget/settings/hub");
  // },
  settings_member: function () {
    return import("./builtins/widget/settings/member");
  },
  // settings_members_list: function () {
  //   return import("./builtins/widget/settings/members-list");
  // },
  // settings_private_hub: function () {
  //   return import("widget/settings/private-hub");
  // },
  // settings_share_hub: function () {
  //   return import("widget/settings/share-hub");
  // },
  tag_item: function () {
    return import("./builtins/window/addressbook/widget/tag-item");
  },
  test_result: function () {
    return import("./modules/test/widget/result");
  },
  text_viewer: function () {
    return import("./builtins/player/text");
  },
  tooltip: function () {
    return import("./builtins/widget/notifier");
  },
  user: function () {
    return import("./modules/desk/user");
  },
  vector_viewer: function () {
    return import("./builtins/player/vector");
  },
  video_player: function () {
    return import("./builtins/player/video");
  },
  video_viewer: function () {
    return import("./builtins/player/video");
  },
  welcome_feedback: function () {
    return import("welcome/feedback");
  },
  welcome_invitation: function () {
    return import("welcome/invitation");
  },
  welcome_reset: function () {
    return import("welcome/reset");
  },
  welcome_signin: function () {
    return import("welcome/signin");
  },
  widget_chat_forward_list_item: function () {
    return import("./builtins/window/bigchat/widget/chat-forward-list-item");
  },
  widget_chat_item_forward: function () {
    return import("./builtins/window/bigchat/widget/chat-item-forward");
  },
  widget_chat_item: function () {
    return import("widget/chat-item");
  },
  widget_chat: function () {
    // return import("./builtins/chat/hub");
    return import("./builtins/widget/chat");
  },
  widget_meeting: function () {
    return import("./builtins/widget/meeting");
  },
  widget_meeting_member: function () {
    return import("./builtins/widget/meeting/member");
  },
  widget_contact_detail: function () {
    return import("./builtins/window/addressbook/widget/contact-detail");
  },
  widget_contact_form: function () {
    return import("./builtins/window/addressbook/widget/contact-form");
  },
  widget_contacts: function () {
    return import("./builtins/window/addressbook/widget/contacts");
  },
  widget_dropdown_menu: function () {
    return import("./builtins/window/adminpanel/widget/dropdown-menu/index");
  },
  widget_efs_list: function () {
    return import("./builtins/window/serverexplorer/widget/efs_list");
  },
  widget_email_notification: function () {
    return import("./builtins/window/sharebox/widget/email-notification");
  },
  widget_helpdesk_category: function () {
    return import("./builtins/window/helpdesk/widget/help-category/index");
  },
  widget_helpdesk_item: function () {
    return import("./builtins/window/helpdesk/widget/help-item/index");
  },
  widget_invitation_email_item: function () {
    return import("./builtins/window/sharebox/widget/invitation-email-item");
  },
  widget_invitation_email: function () {
    return import("./builtins/window/sharebox/widget/invitation-email");
  },
  widget_invite_notification: function () {
    return import("./builtins/window/addressbook/widget/invite-notification");
  },
  widget_member_choose_admins: function () {
    return import("./builtins/window/adminpanel/widget/member-choose-admins/index");
  },
  widget_member_detail: function () {
    return import("./builtins/window/adminpanel/widget/member_detail/index");
  },
  widget_member_form: function () {
    return import("./builtins/window/adminpanel/widget/member_form/index");
  },
  widget_member_roles_menu_items: function () {
    return import("./builtins/window/adminpanel/widget/member-roles-menu-items/index");
  },
  widget_member_roles_menu: function () {
    return import("./builtins/window/adminpanel/widget/member-roles-menu/index");
  },
  widget_member_tag_item: function () {
    return import("./builtins/window/adminpanel/widget/member_tag_item/index");
  },
  widget_member_tags: function () {
    return import("./builtins/window/adminpanel/widget/member_tags/index");
  },
  widget_member_who_can_see: function () {
    return import("./builtins/window/adminpanel/widget/member-who-can-see/index");
  },
  widget_members_list_item: function () {
    return import("./builtins/window/adminpanel/widget/members-list-item/index");
  },
  widget_members_list: function () {
    return import("./builtins/window/adminpanel/widget/members_list/index");
  },
  widget_members_search: function () {
    return import("./builtins/window/adminpanel/widget/members-search/index");
  },
  widget_search: function () {
    return import("./builtins/window/addressbook/widget/search");
  },
  widget_sharebox_members_list_item: function () {
    return import("./builtins/window/sharebox/widget/invitation-email-item/index");
  },
  widget_sharebox_setting: function () {
    return import("./builtins/window/sharebox/widget/sharebox-setting");
  },
  widget_shareroom_detail: function () {
    return import("./builtins/window/bigchat/widget/shareroom-userdetails");
  },
  widget_shareroom_user_item: function () {
    return import("./builtins/window/bigchat/widget/shareroom-user-item");
  },
  widget_simple_invitation: function () {
    return import("./builtins/window/schedule/widget/simple-invitation/index");
  },
  widget_suggest_contact_item: function () {
    return import("./builtins/window/sharebox/widget/suggest-contact-item");
  },
  widget_sv_new_folder: function () {
    return import("./builtins/window/serverexplorer/widget/sv-new-folder");
  },
  widget_tag_form_menu: function () {
    return import("./builtins/window/addressbook/widget/tag-form-menu");
  },
  widget_tag: function () {
    return import("./builtins/window/addressbook/widget/tag");
  },
  window_addressbook: function () {
    return import("./builtins/window/addressbook");
  },
  window_adminpanel: function () {
    return import("./builtins/window/adminpanel/index");
  },
  window_bigchat: function () {
    return import("./builtins/window/bigchat");
  },
  window_channel: function () {
    return import("./builtins/window/channel");
  },
  window_connect: function () {
    return import("./builtins/window/connect");
  },
  window_choice: function () {
    return import("./builtins/window/choice");
  },
  window_confirm: function () {
    return import("./builtins/window/confirm");
  },
  window_contact: function () {
    return import("./builtins/window/contact");
  },
  window_downloader: function () {
    return import("./builtins/window/downloader");
  },
  window_filter: function () {
    return import("./builtins/window/filter");
  },
  window_folder: function () {
    return import("./builtins/window/folder");
  },
  window_info: function () {
    return import("./builtins/window/info");
  },
  window_launcher: function () {
    return import("./builtins/window/launcher");
  },
  window_manager: function () {
    return import("./modules/desk/wm");
  },
  window_meeting: function () {
    return import("./builtins/window/meeting");
  },
  window_search: function () {
    return import("./builtins/window/search");
  },
  window_sharebox: function () {
    return import("./builtins/window/sharebox");
  },
  window_team: function () {
    return import("./builtins/window/team");
  },
  // panel_trash: function () { return import("./builtins/window/trash")},
  panel_trash: function () {
    return import("./builtins/panel/trash");
  },
  panel_trash_item: function () {
    return import("./builtins/panel/trash/item");
  },
  window_upload_progress: function () {
    return import("./builtins/window/upload-progress");
  },
  window_wallpaper_settings: function () {
    return import("./builtins/window/wallpaper-settings");
  },
  window_website: function () {
    return import("./builtins/window/website");
  },
  webrtc_attendee: function () {
    return import("./builtins/webrtc/attendee");
  },
  webrtc_local_user: function () {
    return import("./builtins/webrtc/endpoint/local/user");
  },
  webrtc_participants: function () {
    return import("./builtins/webrtc/participants");
  },
  webrtc_remote_display: function () {
    return import("./builtins/webrtc/endpoint/remote/display");
  },
  webrtc_remote_user: function () {
    return import("./builtins/webrtc/endpoint/remote/user");
  },
  sound_analyzer: function () {
    return import("./builtins/widget/sound-analyzer");
  },
  ws_channel: function () {
    return import("./router/websocket");
  },
};
