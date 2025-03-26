
**All request to contact must set hub_id to Visitor.get(_a.id)**

**MANDATORY**
_optionnal_

contact:
========

  ## _SVC.contact.invite (to invite a drumate or a non drumate )
    **email**  (email of the recipient   or email of the drumate or ident of the drumate     )
    _firstname_ (first name of contact)
    _lastname_  (last name of contact)
    _message_ (message to send to the recipient)
    OUTPUT : 
      - if recipient is drumate : .status -> ALREADY_IN_CONTACT || ALREADY_INVITED
      - if recipient is non drumate : .status -> NON_DRUMATE
 
  ## _SVC.contact.invite_get  (to get all the invitation(s) and accept information(s)  )
    OUTPUT : fullname,drumate_id,email,status
    key field(s) : status  
        If status is "received" then the invitation is either for 'accept' or  for 'refuse'.
        If status is "informed" , the invitation has been accepted. just a information message.      

   ## _SVC.contact.invite_count
    OUTPUT : cnt  (total number of count)
     
  ## _SVC.contact.invite_refuse
    **email**  (email or id of the drumate)
  
  ## _SVC.contact.invite_accept
    **email**  (email or id  of the drumate)

  ## _SVC.contact.accept_informed
    **email**  (email or id  of the drumate)  
  
  ## _SVC.contact.add
    _firstname_  (first name of contact)
    _lastname_   (last name of contact)
    _surname_   (surname name of contact)
    _invite_  ('0' for no invite and '1' for invite)
    _invitee_id_ (the drumate id from the contact search, whom to be invited (only by drumate id)) 
    _comment_ (free comments about the contact )
    _message_ (invite message )
    _tag_     ( Array/list of tag id(s) associate with this contact) EX: ["b61f5f1fb61f5f3a"."76895f1fb61u5f3s"]
    _email_   (email list  Ex:[ {"category":"prof","email":"gopinathk@ihorse.com","is_default":"1"} , {"category":"priv","email":"kt.gopinath@gmail.com", "is_default":"0"} ] )
    _mobile_  (moblie list  Ex:[ {"category":"prof","phone":"+9 123"}, {"category":"priv","phone":"+1 8989"} ] )
    _address_ (address list  Ex:[ {"category":"prof","street":"23 avenue" ,"city":"75008 Paris","country":"France" }] )
    
    NOTE :  Either invitee_id or email should have the value but not both.  

  ## _SVC.contact.show_contact  ( To list the all the contacts for left pane )
    _tag_id_ ( id of the tag or empty object, empty object will list all the conacts and if tag specified  )
    _name_   ( either 'name' or 'date')     
    _order_  ( either 'desc' or 'asc' )   
    _page_   ( defaulted to 1)   

    OUTPUT : contact_id, fulname, comment 
    key field(s) : contact_id


 ## _SVC.contact.get_contact  ( To get details for a individual contact for right pane )
    **contact_id**  (id of the contact )     
    
    OUTPUT : contact_id, fulname, comment ,email list, phone list, address list
    key field(s) : contact_id, email_id in email list, phone_id in phone list, address_id in address list.   

  ## _SVC.contact.update
    **contact_id**  (id of the contact )
    _firstname_  (first name of contact)
    _lastname_   (last name of contact)
    _surname_   (surname name of contact)
    _invite_  ('0' for no invite and '1' for invite)
    _comment_ (free comments about the contact )
    _message_ (invite message )
    _tag_     ( Array/list of tag id(s) associate with this contact) EX: ["b61f5f1fb61f5f3a"."76895f1fb61u5f3s"]
    _email_   (email list  Ex:[ {"category":"prof","email":"gopinathk@ihorse.com","is_default":"1"} , {"category":"priv","email":"kt.gopinath@gmail.com","is_default":"0"} ] )
    _mobile_  (moblie list  Ex:[ {"category":"prof","phone":"+9 123"}, {"category":"priv","phone":"+1 8989"} ] )
    _address_ (address list  Ex:[ {"category":"prof","street":"23 avenue" ,"city":"75008 Paris","country":"France" }] )

  ## _SVC.contact.delete_contact 
     **contact_id**  (id of the contact )

  ## _SVC.contact.delete_contact_address 
     **contact_id**  (id of the contact )  
     **address_id**  (id of the address ) 

  ## _SVC.contact.delete_contact_email 
     **contact_id**  (id of the contact )  
     **email_id**  (id of the email )  

  ## _SVC.contact.delete_contact_phone 
     **contact_id**  (id of the contact )  
     **phone_id**  (id of the phone )  
  
  ## _SVC.contact.invitation_status
      **token** ( token sent with email contact invitation link   )
      _uid_  ( drumate id of logged in user)
     
      OUTPUT : status, contact_id ,message;
      key field(s) : status 
        If status is "received" then the invitation is either for 'accept' or  for 'refuse'.
        If status is "active" , then the invitation is accepted.
        If status is "invalid", then it is others invitation.
        If status is "nodata",  then not a valid token.



  ## _SVC.contact.search
      _key_   ( letters to search )
      _page_  ( defaulted to 1)
    
  
group:  
=====

  ## _SVC.contact.create_group
      **name**  (Name of the group to create)
      Note : There is no possibility to create two or more groups with same name. 
  
  ## _SVC.contact.show_groups
      _tag_id_ ( id of the tag or empty object, empty object will list all the groups and if tag specified )
      _name_  ( either 'name' or 'date')     
      _order_ ( either 'desc' or 'asc' )   
      _page_  ( defaulted to 1)  

      OUTPUT : group_id, name , category 
      key field(s) : group_id , name (name of the group)
      Note : if the 'category' contains the value 'origin' then list this group in the addressbook. 

  ## _SVC.contact.search
      **name** (contact's name & contact's emailId )
      **page** (defaulted to 1)

      OUTPUT : contact_id, email , fullname,is_drumate 
      key field(s) : contact_id , is_drumate 
      Note: This service used to find the contact(s) in a drumate's address book. 
            If 'is_drumate' contains the value '1' then he/she is a drumate and eligible to add in the group.

  ## _SVC.contact.add_to_group
      **group_id** (group name)
      **contact_id** (may be sent as array)
  
  ## _SVC.contact.show_members
       **name** (group name or group_id)
  
  ## _SVC.contact.remove_from_group
      **group_id** (group name)
      **contact_id** (may be sent as array)
  
  ## _SVC.contact.delete_group
      **name**  (group name or group_id)

blacklist: 
==========
  ## _SVC.blacklist.add
    **email**
  ## _SVC.blacklist.delete
    **email**
  ## _SVC.blacklist.show
    **page** (defaulted to 1)
  