**MANDATORY**
_optionnal_

Calendar:
========

## _SVC.agenda.add_calendar (To add new calendar)
    **name**        (name of the new calendar)
    _color_         (color with hexadecimal )
    _is_default_    (either '0' or '1', it used to set the default calendar)

## _SVC.agenda.modify_calendar (To modify the  calendar)
    **calendar_id** (id of the existing calendar)
    **name**        (name of the calendar)
    _color_         (color with hexadecimal )
    _is_default_    (either '0' or '1', it used to set the default calendar)

## _SVC.agenda.delete_calendar (To delete a calendar)
    **calendar_id** (id of the calendar,the calendar to delete)

## _SVC.agenda.select_calendar (To list all the associated agenda based on the selected calender)
    **calendar_id** (List of calenders ids, using this calendar ids the assiciated agenda are listed in the date sheet)    
    **stime**  (From time , the time should be unixtimestamp )
    **etime**  (To time , the time should be unixtimestamp )  

## _SVC.agenda.list_calendar ( To list all the calendar)
    OUTPUT : calendar_id, category,color,is_default,is_selected, name,owner_id
    category (either 'own' or 'other', 'own' means the repective calendar is belongs to the user otherwise owned by other drumate )    
    is_default   (if it is '1' then the calendar is a default calendar )
    is_selected  (if it is '1' then the calendar is selected for display )



Agenda :
========

## _SVC.agenda.add_agenda (To add new agenda)
    **stime**     ( start time of the new agenda )
    _etime_       ( end time of the new agenda )   
    _name_        ( name of the new agenda )  
    _place_       ( place of the new agenda )  
    _calendar_id_ ( The calendar_id to associate the new agenda )  
    _contact_id_  ( List of contact_id to associate the new agenda )    

## _SVC.agenda.modify_agenda (To modify the exsiting agenda)
    **agenda_id** ( id of the existing agenda )
    **stime**     ( start time of the  agenda , the time should be unixtimestamp)
    _etime_       ( end time of the  agenda , the time should be unixtimestamp)   
    _name_        ( name of the  agenda )  
    _place_       ( place of the  agenda )  
    _calendar_id_ ( The calendar_id to associate the  agenda )  
    _contact_id_  ( List of contact_id to associate the agenda ) 

## _SVC.agenda.remove_agenda (To remove an agenda)
    **agenda_id** ( id of the agenda to remove )

## _SVC.agenda.show_agenda (To show agenda's detail)
    **agenda_id** ( id of the agenda to diplay it all details )
