
## _SVC.tagcontact.add
    **name**  (name of the new tag)
    _parent_id_  (id for the parent tag)

## _SVC.tagcontact.show_tag_by  (To get all first level child tags for a given tag)
    _tag_id_ ( id of the tag or empty object, empty object will list all the root tags )
    _search_  ( search text)
    _page_   ( defaulted to 1)   

## _SVC.tagcontact.remove
    **tag_id** ( id of the tag to remove or delete )

## _SVC.tagcontact.rename
    **tag_id** ( id of the tag to rename )
    **name**  (name of the tag)

## _SVC.tagcontact.tag_assign ( Assign a tag to a new parnet tag)
    **tag_id**    (id of the tag )
    **parent_id** (id for the parent tag)

## _SVC.tagcontact.entity_assign
    **tag_id**   ( id of the tag to which the contact or group has to be assign )
    **entity_id** ( id of the contact or group )
    **category**  ('group' or 'contact')
    
## _SVC.tagcontact.reposition
    **content**   (list of tags in the order they need to show in the ui  )

    