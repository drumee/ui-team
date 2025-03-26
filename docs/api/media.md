


Contributers' remit(Values) in adminpanel 
========================================
 owner            : 0b0111,  -> 7
 admin            : 0b0110,  -> 6
 admin_security   : 0b0101,  -> 5
 admin_member    : 0b0100,  -> 4
 admin_view       : 0b0011,  -> 3
 member           : 0b0001,  -> 1


**MANDATORY**
_optionnal_


Authoritative Service(s)
=======================
## _SVC.adminpanel.my_organisation (To get the currnt vistor's organisation detail )
## _SVC.adminpanel.my_subscription (To get the currnt vistor's active subscription )
## _SVC.adminpanel.my_privilege (To get the currnt vistor's privilege for adminpanel )


Organisation Services
=======================
## _SVC.adminpanel.organisation_add (To get the currnt vistor's organisation detail )
    **name**   (name of the organisation)
    **ident**  (domain of the organisation)
 

## _SVC.adminpanel.organisation_update (To get the currnt vistor's active subscription )
    **orgid**   (id of the organisation to update ) 
    **name**   (name of the organisation)



## _SVC.adminpanel.organisation_update_password_level (To set password level)
    **orgid**   (id of the organisation to update ) 
    **option**  (Value to set the password level)

## _SVC.adminpanel.organisation_update_double_auth (To set double authentication)
    **orgid**   (id of the organisation to update ) 
    **option**   (0 or 1 )

## _SVC.adminpanel.organisation_update_dir_visiblity (To set directory  visiblity)
    **orgid**   (id of the organisation to update ) 
    **option**   ('all' or 'none')

## _SVC.adminpanel.organisation_update_dir_info (To set directory information )
    **orgid**   (id of the organisation to update ) 
    **option**   ('all' or 'name')

Role(tag in admin panel) services
=======================

## _SVC.adminpanel.role_add (To add new role to a organisation)
    **name**        (name of the new role) 
    **orgid**   (id of the organisation) 

## _SVC.adminpanel.role_show (To list all the role(S) in the given organisation)
    **orgid**   (id of the organisation to list the role)  
     _page_         (page number default 1)

## _SVC.adminpanel.role_delete (To delete a role from a organisation)
    **role_id**     (id of  the role to delete) 
    **orgid**   (id of the organisation) 

## _SVC.adminpanel.role_assigned (To get the assigned role list for the give user)
    **user_id**     (id of  the drumate) 
    **orgid**   (id of the organisation) 



Member's service 
================
## _SVC.adminpanel.member_add (To create a new member/drumate under a given organisation with role(s) )
    **orgid**       (id of the organisation)       
    **firstname**   (firstname of the user )      
    **lastname**    (lastname of the user )       
    **address**     (address of the user )   EX : {"street":"malikottai", "city" : "Trichy", "country":"INDIA"},    
    **ident**       (ident of the user )      
    **email**       (email of the user )      
     _mobile_       (phone number of the user )      
     _role_         (Role list )  Ex : [15,16,17]

## _SVC.adminpanel.member_update (update drumate detail under a given domain)
    **user_id**     (drumate's id whos details need to update) 
    **orgid**       (id of the organisation)       
    **firstname**   (firstname of the user )      
    **lastname**    (lastname of the user )       
    **address**     (address of the user )   EX : {"street":"malikottai", "city" : "Trichy", "country":"INDIA"},    
    **ident**       (ident of the user )      
    **email**       (email of the user )      
     _mobile_       (phone number of the user )      
     _role_         (Role list )  Ex : [15,16,17]

## _SVC.adminpanel.member_list( To list all user(s) under a given domain/role)
    **orgid**       (id of the organisation)    
    _role_id_       (id of the role to get/list the associated drumates, Empty will list all members in the orgainsation )   
    _page_          ( page number default 1)
    _key_           ( letters to search )
    _option_        ( 'member'      -  To get all the users including admin member
                      'admin'       -  To get admin members only 
                      'nonadmin'    -  To get all the users excluding admin member
                      'blocked'     -  To get blocked users
                      'archived'    -  To get archived users
                    )


## _SVC.adminpanel.member_show( To get the user detail based on drumate's id & domain's id )
    **orgid**       (id of the organisation)        
    **user_id**     (id of the drumate ) 


## _SVC.adminpanel.member_block (To block a member)
    **orgid**      (id of the organisation  ) 
    **user_id**     (id of the drumate to block) 

## _SVC.adminpanel.member_unblock (To unblock a member)
    **orgid**      (id of the organisation  ) 
    **user_id**    (id of the drumate to unblock) 

## _SVC.adminpanel.member_member_authentification (To set authentification method to a member)
    **orgid**      (id of the organisation  ) 
    **user_id**    (id of the drumate to unblock) 
    **option**    ('double'  for double authentification , 'normal' for normal authentification  ) 


## _SVC.adminpanel.member_loginlog (To get login history in descending  chronological order)
    **orgid**      (id of the organisation  ) 
    **user_id**    (id of the drumate ) 
      _page_       ( page number default 1)

## _SVC.adminpanel.member_change_status (To set blocked or ar  )
    **orgid**      (id of the organisation  ) 
    **user_id**    (id of the drumate ) 
    **status**      ( 'locked' or 'archived' or 'active')


Contributer service: 
===================
## _SVC.adminpanel.member_admin_list( To get admin list based on the organisation )  --- to be remove  
    **orgid**       (id of the organisation)        
    _page_          ( page number default 1)

## _SVC.adminpanel.member_admin_add( To make a one or more members as admin )
    **orgid**       (id of the organisation)        
    **users**       (list of ids ,  id of the member/drumate belong to the respctive organisation ) 
    **privilege**   (privilege value for admin)

## _SVC.adminpanel.member_admin_remove( To revoke admin privilege to one or more admin members)
    **orgid**       (id of the organisation)        
    **users**       (list of ids ,  id of the member/drumate belong to the respctive organisation ) 
   




Send password Link : 
===================
## _SVC.adminpanel.send_password_link( To send a reset password link to one or more members of the organisation) 
    **orgid**       (id of the organisation)        
    **users**       (list of ids ,  id of the member/drumate belong to the respctive organisation )


DataLoad:
=========
## _SVC.adminpanel.members_import 
    **orgid**    (id of the organisation)        
    _file_id_    (Uploaded file id)
    _uploaded_id_ (Uploaded file id)

   


See Desk
========

## _SVC.adminpanel.mimic_new( Admin call this service to request to member for 'See desk' session)
    **orgid**       (id of the organisation)        
    **user_id**       (id of the member) 
   
## _SVC.adminpanel.mimic_reject(  Memeber call this service to  reject the 'See desk' session's request)
    **orgid**       (id of the organisation)        
    **mimic_id**       (id of the session ) 
   
## _SVC.adminpanel.mimic_active (Memeber call this service to  accept(ie activate) the 'See desk' session's request)
    **orgid**       (id of the organisation)        
    **mimic_id**       (id of the session) 

## _SVC.adminpanel.mimic_end_byuser( Memeber call this service to  close the active  'See desk' session)
    **orgid**       (id of the organisation)        
    **mimic_id**       (id of the session) 

## _SVC.adminpanel.mimic_end_bymimic(  Admin call this service to  close  the active 'See desk' session)
    **orgid**       (id of the organisation)        
    **mimic_id**       (id of the session) 