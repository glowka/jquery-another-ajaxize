##### 1.0.0
-

##### 1.0.1

*core:*
*  ```ajaxize_prepare``` is now consisting with documentation, previous arguments were jqXHR-obj and settings-obj instead of
  documented event-obj

*api:*
*  added event ```change``` for elements input, select, textarea (until now it was only ```keydown```);
  it does not make a difference for input[type=text] and textarea as this event is fired only when they lose focus,
  it does bring much of a change for other inputs and select tags though, because with them it gets fired immediately after
  real value change and is great complement for keydown() event
*  switched ```keydown``` to ```keyup```, because in case of editing keydown gives value of an element before
  its change and keyup after the element is updated


##### 1.0.2

*core:*
*  delay mechanism added - prevents from making multiple requests when few events happens at a time, eg few keys are pressed

*conf:*
* ```delay``` option added, sets in milliseconds delay time


##### 1.0.3

*tools:*
*  added option ```ajaxize_history``` to change state of navigation bar after every use of ajaxize ```ajaxize_history="true|false"```



##### 1.0.4

*tools:*
*  ```ajaxize_history``` saves history and reloads page while using history back (still needs some enhancement)



##### 1.0.5

*api:*
*  button tag is now supported and can be ajaxized



##### 1.0.6

*tools:*
*  animate function added, when using ```ajaxize_load``` or ```ajaxize_append``` automatically 'loading...' communicate appears

**TODO:**
* customizable communicate content
* option of disabling animation (ajaxize_animate="false")
* option of adding animation in case ajaxize_call is used (ajaxize_animate="<<selector>>")
* consider ajaxize.ajaxing_xxxx functions namespace restructuring


##### 1.0.7
*api:*
*  jQuery extension added, object ajaxing can now be triggered using: ```jQuery('selector').ajaxing()```
*  div tag is now supported, it works of course only with 'ajaxing' element


##### 1.0.8
*api:*
*  ```ajaxize_events``` added, using this attribute it is possible to specify some extra custom events that single element will be ajaxized with
*  ajaxize element with customized events by expressions like ```ajaxize_events="change"``` or ```ajaxize_change="change, keyup"```

conf:
*  set possible events domain using ajaxize.events eg. custom_events = ['change', 'keyup']


##### 1.0.9
*core:*
*  delay set to 0 bypasses setInterval, so delay is really 0 then

conf:
*  new configuration ajaxize.custom_delays added, thanks to this option each event can have different delay time set


##### 1.0.10
*core:*
*  ```event.stopPropagation()``` for event 'ajaxing' to call only element event was triggered on


##### 1.0.11
*api:*
*  in ```ajaxize_load``` and ```ajaxize_append``` ```this``` keyword can be used, it refers to object it is specified at


##### 1.0.12
*core:*
*  added mechanism preventing calling request with an object when previous call with it is not finished


##### 1.0.13
*core:*
*  added function of adding parameter ```?ajaxize_unique=xxxxxx``` to prevent GET requests from being cached (especially in IE)
*  ajaxing jQuery extension accepts 'url' argument, if argument is given it updates object with it and re-ajaxizes it
*  possibility of making executing function right after making a request ( after ```ajaxize_prepare``` and before ```ajaxize_call```)
  using parameter ```ajaxize_precall="<<function>>"```

**TODO:**
  *  in combination with ping function using ajaxize_precall can double the speed up making consequent request, so there is to do ping implementation and combining with ajaxize_precall

##### 1.1.0
*core:*
*  functions split,
*  complicated relations disentangled
*  some each other duplicating schemas removed
*  namespaces name corrections
*  this.ajaxing variables renamed

*tools:*
*  ping function added (unused so far)

*api:*
*  ```ajaxize_animate=<<True|False>>``` added (takes effect only with load and append functions)

**TODO:**
*  easy customizable content of ajaxize_animate
*  ```ajaxize_animate``` equivalent to ajaxie_call ('loading...' similar to gmail's one)
*  advanced option of checking textarea/input change caching the value


##### 1.1.1
*core & api:*
*  ajaxize.onload_register allows to add functions that will be executed after every request
    *  use ```var f_id = ajaxize.onload_register.add(function(){});``` to add function
    *  and ```ajaxize.onload_register.remove(f_id);``` to remove and stop execution


##### 1.1.2
*core & api:*
*  new option of forcing redirection (with page reloading) simply by passing ajaxize.redirect in JSON answer




##### 1.1.3
core & api & *tools:*
*  new *tools:*
    *  ```ajaxize_closest```
    *  ```ajaxize_closest_load```
    *  ```ajaxize_closest_append```
*  HTML5 support
  Since now data-ajaxize-* attributes names are supported and will be shortly only valid option
*  bug of ajaxing namespace fixed *  not only direct object of ajaxing namespace can be accessed but
  also indirect so e.g. ajaxize_call="names.function" is valid and ajaxing.names.function will be called

**TODO:**
 *  updating some core structures to ones that match better growing number of options
 *  to gradually get prepared for bigger architecture changes


##### 1.1.4
*bug:*
*  little fixing after v1.1.3 refering to jQuery(selector).ajaxing(url)


##### 1.1.5
*bug:*
*  little fixing after v1.1.3 refering to resolving namespaces


##### 1.2.0beta
* module rewritten using new architecture
 *  public ```AjaxWrap``` class as interface for making ajax request (ajaxing) and binding events (ajaxizing)
 *  private ajaxTemplate object as connector of ```AjaxWrap``` with ```jQuery.ajax()```
 *  new architecture reduced size of module giving more functions, much cleaner code and bigger flexibility at the same time
* new global params
 *  ```debugMode``` - validating all ajaxize parameters and showing all errors, should be used while developing and switched off in production for better performance
 *  ```safeMode``` - with this mode on ajaxized elements caches all given parameters and backdoor changing of HTML element does not modify ajaxize parameters
 *  ```html5``` - with html5 mode active attribute should change from ajaxize_x to data-ajaxize-x form
* jquery extension
 *  the jQuery extension is offering now more function eg:
  * ```jQuery(elems).ajaxize```
  * ```jQuery(elems).ajaxing```

And few things more...

All new features to be described soon.


##### 1.2.1
*api:*
*  removed ```ajaxize_noHTTP```, ```ajaxize_call``` without given url behaves exactly like noHTTP
*  ```ajaxize_call``` arguments changed, now there are always three arguments (target, data, event)
  when load/append (HTML) request is made target=object that html will be loaded/appended to, and data=null; 
  when JSon request is made target=null, data=parsed json data

*core:*
*  all function path names are resolved in one place - ```AjaxWrap.ajaxizeFuncAttr```

##### 1.2.2
*api:*
*  added ```ajaxize_request=<<True|False>>``` parameter allowing not to make request even if both url and call are
  defined
  
##### 1.2.3
*bug:*
*  ```ajaxize_prepare``` when ajaxized used without url behaves exactly the same way as with it

*core:*
*  on ```click``` and ```submit``` events  ```preventDefault``` is called

##### 1.2.4
*core:*
*  ```ajaxize_prepare``` is called right after catching the event not after awaiting the whole delay time

##### 1.3.0
*release after long time, with many bug fixes and extended functions:*
* ```ajaxize_method``` for making both post or get requests when needed
* ```csrf``` global option for appending csrf var to request


##### 1.3.1
* ```ajaxize_propagation``` parameter to control ```event.stopPropagation()``` calling or not
* ```ajaxize_events``` is now space separated list of events instead of space separated list of events, just like jQuery notation.s
* ```sendAnalyticsEvent``` global option for automatic google analytics events logging