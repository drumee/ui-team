HI @Somanos sar,
1. give access to exact file/folder to exact person
  @postData
    service:_SVC.permission.grant
    nid    : to_be_set   # '*' means any files inside the hub 
    hub_id : to_be_set
    users  : [to_be_set] # one or more users /!\ use array if more than one users 
    expiry : number of hour # tell me if you want other time unit (0 for no limit)
    permission : [0xO1-0x1F]  # see lex/constants/permission or privilege
  

2. get list of persons, who have access to this file/folder
  @fetchData
    service :_SVC.permission.show_users
    nid     : to_be_set  # '*' means any files inside the hub / hub means share, project or site
    hub_id  : to_be_set

3. remove person from file
  @postData
    service:_SVC.permission.revoke
    nid    : to_be_set  # '*' means any files inside the hub / hub means share, project or site
    hub_id : to_be_set
    users  : [to_be_set] # list of users array expected 
 
4. room rights - default rights to all new added persons
  @postData
    service:_SVC.hub.update_settings
    hub_id : to_be_set
    vars : 
      default_privilege : [0xO1-0x1F]

5. add admin/remove admin/update admin
  ## add  ##
  @postData
    service:_SVC.hub.add_contributor
    hub_id : to_be_set
    uid    : user_id 
    privilege : _k.privilege.admin
    expiry : number of hour # tell me if you want other time unit (0 for no limit)
  
  ## show admin  ##

  @fetchData(
    service   : _SVC.hub.get_contributors
    hub_id    :....
    privilege : _K.permission.admin

    When option privilege is not set, it show all members
    When set, it show the one that match the PERMISSION. 
    Do not confuse with privilege
    _K.permission.admin  => 8 (0x08)
    _K.privilege.admin =>15 (0x0F) 

  ## remove : ##
  @postData
    service:_SVC.hub.delete_contributor
    hub_id : to_be_set
    users  : [to_be_set]  # one or more users /!\ use array if more than one users

  ## downgrade : ##

  @postData
    service   : _SVC.hub.set_privilege
    hub_id    : to_be_set
    users     : [to_be_set] # list of users array expected 
    privilege : [0xO1-0x1F]

6. change owner 
  @postData
    service:_SVC.hub.change_owner
    hub_id : to_be_set
    id     : new_user_id

7. Show members of a hub 
  @fetchData
    service:_SVC.hub.show_contributors
    hub_id : to_be_set


8. Set all members privilege (except admin and owner)
  @postData
    service   :_SVC.hub.set_members_privilege
    hub_id    : to_be_set
    privilege : to_be_set
