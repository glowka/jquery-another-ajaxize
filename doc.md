# another-ajaxize 
documentation for version **1.3.3**
*by Tomasz Główka*

### Introduction
Main aims & functions of this tool:
 - help avoiding duplication of urls values in js code, so that it could remain in the single location - on server's
   script side
 - make main output code - HTML - more readable, tool enforces consisting all relevant information in HTML source
 - effortlessly prepare urls structure for making pages dedicated for web-crawlers and non-js users
 - eliminate constantly repeating and pretty obvious lines of code from HTTP request scheme

Ajaxize processing scheme:

1. [site loading] Finding all HTLM elements to be ajaxized ( looking for elements possessing attribute ```ajaxize=do``` )
2. [site loading] Validating all ajaxize attributes of elements (prefix 'ajaxize')
3. [site loading] Basing on type of HTML element and ajaxize attributes for that element proper event hooks are used,
  like: click, submit, keydown etc.
4. [user interaction] On event call, when hook is used HTTP request is completed with use of earlier validated ajaxize
  attributes.

### Options
AJAXize global configuration fields list inside ajaxize namespace.

* ```debugMode``` - full validation of ajaxized objects
* ```cacheAjaxizedMode``` - making copy (shallow) of ajaxized object attrs if ```debugMode``` active
* ```html5Mode``` - use data-ajaxize-* instead of ajaxize_* attributes
* ```sendAnalyticsEvent``` -  automatic google analytics events logging
* ```urlPrefix:string``` - sets prefix added to every url when making HTTP request
* ```csrfVarName``` - name of csrf var sent with url
* ```csrfGetter``` - path to global var with csrf value or function getting that value
* ```defaultDelay:integer``` - sets global value of period (in ms) that must occur after triggering AJAXize hooks before request is actually made, when time is not up and new hook is triggered again, another period of time must occur
* ```defaultEventsDelays:object {'event':value,... }``` - sets individual delay value for each event like ajaxize.delay does globally
* ```timeout:integer``` - response timeout


### Urls

AJAXize automatically creates ajax urls by adding ajaxize.prefix prefix to original url of an element.
Thanks to this solution, while making your HTML code you don't have to worry neither about manual creating ajax
addresses, nor about the way to dynamically pass them to your javascript code.

Certain attributes are searched for as a source of request address:
* action       in    ```<form>```
* href         in    ```<a>```
* ajaxize_url  in    ```<other_tag>```  (more about attributes in next section)

```#``` url is treated as empty url

### Attributes

Set them in normal html way  ```<tag ajaxize_x="val_x" ajaxize_y="val_y></tag>.```

List of all possible attributes:
* ```ajaxize="do"``` - submits element to AJAXize processing;
* ```ajaxize_url="<<url>>"``` - when regarding to HTML specification object can't posses action or href attribute, ajaxize_url with valid url must be specified instead (without ajax prefix);
* ```ajaxize_prepare="<<function>>"``` - function called before making HTTP request, event object is passed as an argument, in case of returning `false` (matching by value and type) the request will be canceled; <<function>> has to be located in 'ajaxing' namespace;
* ```ajaxize_precall="<<function>>"```          - function called after HTTP request is made, but before response is given, in fact function called right after HTTP request
* ```ajaxize_call="<<function>>"``` - after HTTP request, content of response is passed as an argument; <<function>> has to be located in ```ajaxing``` namespace; if no url is defined and ajaxize_call is given, it will be executed without making a request, as a simple handler
* ```ajaxize_load="<<selector>>"``` - after HTTP request, content of response is loaded into elements selected by this selector, selector 'this' can be used to refer to element that is AJAXized, selector 'closest' can be used to refer to ajaxize_closest value ;
* ```ajaxize_append="<<selector>>"``` - after HTTP request, content of response is appended to elements selected by this selector, selector 'this' can be used to refer to element that is AJAXized, selector 'closest' can be used to refer to ajaxize_closest value;
* ```ajaxize_closest="<<selector>>"``` - with this option ajaxize_load and ajaxize_append range of action is limited to objects being inside selector 'closest' matching object
* ```ajaxize_events="<<events list>>"```        - comma separated list of events that will be additionally caught, events have to be added to ```ajaxize.customEvents``` conf first to set themas valid events
* ```ajaxize_propagation="<<True|False>>"```        - by default set to true, if true event propagation takes place, otherwise ```event.stopPropagation()``` is called
* ```ajaxize_prevent="<<True|False>>"```        - by default set to true for click and submit events and false for all other events, if true ```event.preventDefault()``` is called
* ```ajaxize_delay="<<int>>"```        - sets time that has to be elapsed to proceed ajaxing after event took place, this overrides default value from ```defaultEventsDelays``` setting
* ```ajaxize_request="<<True|False>>"```        - by default set to true, if otherwise, even in case url is defined, an HTTP request won't be made and ajaxize_call we'll be called
* ```ajaxize_history="<<True|False>>"```    - if checked ajaxize catches history and pushes history state, so 'back' button can be used; 
* ```ajaxize_animate="<<True|False>>"```    - if checked ajaxize adds 'loading...' information while waiting for server response, takes effect only if ```ajaxize_load``` or ```ajaxzie_append``` is specified

##### Expected types of server response

* ```ajaxize_load``` | ```ajaxize_append``` - **HTML** - response loaded into or appended to HTML element
* ```ajaxize_call``` - **JSON** - response passed as a function's argument
* ```ajaxize_call``` - **null** - if tag has no url attribute (view Urls section) or ```ajaxize_request``` is false, no http request is made and response is simply null

##### All ```<<functions>>``` have to be located in 'ajaxing' namespace.

It means that you should define your function as follows:
```
# in html
< ajaxize_call="my_function" />

...

# somewhere else/later in js
ajaxing.my_function = function(target, data, event, pipeData){};
```
Such definition can be placed in any javascript file which inclusion succeeds ajaxize.js

##### ```<<functions>>``` API

```ajaxize_prepare``` :
* ```event``` - event that trigger this ajaxing action, if triggered manually ```null```
* ```pipeData``` - object passed to functions in pipeline - through ```ajaxize_prepare```, ```ajaxize_precall``` and ```ajaxize_call```
* return ```false``` to prevent continuing ajaxing proccess and any other value to let it continue, if ```false``` returned, no HTTP request is made in any case

```ajaxize_precall``` : 
* ```event``` - event that trigger this ajaxing action, if triggered manually ```null```
* ```pipeData``` - object passed to functions in pipeline - through ```ajaxize_prepare```, ```ajaxize_precall``` and ```ajaxize_call```

```ajaxize_call``` :
* ```target``` - if ```ajaxize_load``` or ```ajaxize_append``` is defined (so serverer response is HTML) refers to DOM element server response will be loaded or appended to, otherwise ```null```
* ```data``` - if ```ajaxize_load``` or ```ajaxize_append``` is *not* defined (so server response is JSON) contanis deserialized data from response, otherwise ```null```
* ```event``` - event that trigger this ajaxing action, if triggered manually ```null```
* ```pipeData``` - object passed to functions in pipeline - through ```ajaxize_prepare```, ```ajaxize_precall``` and ```ajaxize_call```


##### This

In all <<functions>> 'this' keyword points to the HTML element being subject of an action.


##### The ```<<selectors>>``` may look like these:
```
<ajaxize_load="#load-here-element">
# assuming there are such elements with corresponding id/class/other attribute:
<div id="load-here-element"></div>

# or

<ajaxize_load=".ManyLoadHereElements">
# assuming there are such elements with corresponding id/class/other attribute:
<a class="ManyLoadHereElements"></a><a class="ManyLoadHereElements"></a>
```

### Combinations of attributes

Definition of element used with AJAXize:

```
<tag
    ajaxize

    # not required only if ajaxize_request="false"
    href | action | ajaxize_url

    [ajaxize_prepare]

    [ajaxize_precall]

    # option 1. ajaxize_call
    # option 2. single one of ajaxize_load and ajaxize_append with optional ajaxize_call
    (
        ajaxize_call
    |
            ajaxize_load [ajaxize_call]
        |
            ajaxize_append [ajaxize_call]
    )

    # takes effect with 'load' or 'append' only
    [ajaxize_request]

    # takes effect with 'load' or 'append' only
    [ajaxize_closest]

    [ajaxize_events]

    # takes effect with 'load' or 'append' only
    [ajaxize_animate]

    [ajaxize_history]
/tag>
```

### Other features


##### jQuery extension

* ```jQuery(...).ajaxing()``` - make a single request with all selected by jQuery objects, objects does not have to have been ajaxized earlier
* ```jQuery(...).ajaxize()``` - ajaxize all selected objects, they will behave like normal objects ajaxized using ```ajaxize="do"```
* ```jQuery(...).deajaxize()``` - remove events binding that was created with previous ajaxize
* ```jQuery(...).reajaxize([url])``` - remove events binding that was created with previous ajaxize, set new url (optionally) and ajaxize again

##### Custom code execution on each Ajax call
To have certain script executed every time ajax request and response is given use ```ajaxize.register``` to add functions that will be executed after every request.

Example:
```
var function_id = ajaxize.register(function(){}); // adding function(){} to onload execution
ajaxize.unregister(function_id); // removing function from onload execution
```

##### Json extra parameters
When giving a response server can pass some parameters. They have to be included in ajaxize namespace.

Here's the list of possible parameters:
* ```redirect``` - if specified, ajaxize wille force the browser to redirect user (with page reloading) to given ```redirect``` url

Example of response with parameters (in javascript after JSON decoding):
```
{
    ajaxing: { redirect: '/'}
}
```
Above response will cause browser to load  page with '/' url.

##### Errors and validation
For some typical errors proper console.error communicates will be thrown:

```
ajaxize_call="non_exisiting_function" - can't find function 'ajaxing.non_existing_function'
ajaxize_load=".NonExisitingClass" - no elements found for '.NonExisitngClass'
```
Similarly, errors are thrown regarding to missing URL and any other important data.


### AjaxWrap interface

In fact, each time tag is ajaxized and when processing request, inner AjaxWrap interface is used.


In most cases the above auto ajaxize interface should be used but in some cases advantage of direct use of AjaxWrap interface can be taken, so here it is.

```AjaxWrap(object, [context])``` - initialize wrap on given object (tag or plain object), optional pass context arg if all ajaxing.* hooks should be called with this context instead of object
* ```ajaxing()``` - trigger ajaxing action on given object/tag, the action will be processed according to its keys/attributes
* ```ajaxize()``` - create ajaxize events listener on given object/tag, the action will be processed according to its keys/attributes, this will take the same effect as setting ```ajaxize="do"``` attribute
* ```deajaxize()``` - remove events listeners that was created with earlier called ajaxize
* ```reajaxize()``` - remove events binding that was created with previous ajaxize, set new url (optionally) and ajaxize again

Examples of```AjaxWrap``` use:
```

# make request using plain object as argument with callback string reference
AjaxWrap({ 'url': '/', 'call': 'generic.simpleAnswer'}).ajaxing();

# make request using plain object as argument with callback direct reference
AjaxWrap({ 'url': '/', 'call':  function() { /* empty call */}}).ajaxing();

# make request using existing object
var tag = jQuery('<a href='/' ajaxize_call="myCallback">Click here</a>).get(0)
jQuery('body').append(tag)
var tag = jQuery('<a href='/' ajaxize_call="myCallback">Click here</a>).get(0)
AjaxWrap(tag).ajaxing()

# ajaxize existing object
var tag = jQuery('<a href='/' ajaxize_call="myCallback">Click here</a>).get(0)
jQuery('body').append(tag)
var tag = jQuery('<a href='/' ajaxize_call="myCallback">Click here</a>).get(0)
AjaxWrap(tag).ajaxize()

```

