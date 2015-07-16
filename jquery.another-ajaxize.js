//v1.3.1
//by Tomasz Główka

(function (window) {

var // PUBLIC

    // key mode settings
    debugMode = true,  // full validation and making copy (shallow) of ajaxized object attrs
    cacheAjaxizedMode = true,
    html5Mode = true,  // data-ajaxize mode instead of ajaxize mode

    sendAnalyticsEvent = true,  // try to send google analytics events on each ajaxing call

    // prefix added to every url when making HTTP request
    urlPrefix = '/ajax',
    csrfVarName = 'csrfmiddlewaretoken',
    csrfGetter = 'urls.csrfToken',

    // possible events that can be specified using ajaxize_events
    customEvents = ['keydown', 'keyup', 'change', 'submit', 'click', 'focus', 'blur', 'paste', 'mouseover', 'mouseout'],

    // delay after which request is made, during delay no event can occur, unless, delay starts again,
    // delays dedicated for certain type of events are set in customDelays
    defaultEventsDelay = 200,
    customEventsDelays = {
        keyup: 400,
        keydown: 400,
        change: 10,
        submit: 0,
        click: 0,
        paste: 0,
        ajaxing: 0,
        mouseout: 0,
        mouseover: 250
    },
    // HTTP response timeout
    timeout = 30000,

    //
    ajaxizeAttr = 'ajaxize',
    attrPrefix = html5Mode ? 'data-ajaxize' : 'ajaxize',
    attrGlue = html5Mode ? '-' : '_',

    // CORE

    // eventRegex -> used for ajaxize_event validation
    eventRegex = new RegExp('^\\s*(?:' + customEvents.join('|') + ')\\s*$', 'i'),

    // ajaxize counter for generating ids
    ajaxizedIdField = 'ajaxWrap',
    ajaxizedId = 1,
    deletedAjaxizedIds = [],
    ajaxizedCache = {},

    // for storing functions registered by ajaxize.register
    registered = {};




var ajaxing = {},
    ajaxize = {

        register :function (func) {
            if (typeof func == 'function') {
                var i = 0;
                while (typeof registered['f' + i] != 'undefined') i++;
                registered['f' + i] = func;
                return i;
            } else
                throw new TypeError('Given func is not a function');
        },

        unregister: function (func_id) {
            if (typeof func_id == 'number' && typeof registered['f' + func_id] == 'function') {
                delete(registered['f' + func_id]);
                return true;
            } else
                return false;
        },

        autoAjaxize: function () {
            // TODO: autoAjaxize might use more properties than ajaxize="do" to get object ajaxized
            var objs = jQuery('['+ attrPrefix + '=do]').get();
            for (var i = 0; i < objs.length; i++)
                AjaxWrap(objs[i]).ajaxize();
        },

        ajaxing: function(params, context) {
            AjaxWrap(params ,context).ajaxing();
        }
    };




jQuery.fn.extend({

    ajaxing: function (context) {
        var objs = this.get();
        for (var i = 0; i < objs.length; i++)
            AjaxWrap(objs[i], context).ajaxing();
        return this;
    },

    ajaxize: function() {
        // no context arg because it should not rather happen that
        // many objects are ajaxized with context
        var objs = this.get();
        for (var i = 0; i < objs.length; i++)
            AjaxWrap(objs[i]).ajaxize();
        return this;
    },

    deajaxize: function() {
        var objs = this.get();
        for (var i = 0; i < objs.length; i++)
            AjaxWrap(objs[i]).deajaxize();
        return this;
    },

    reajaxize: function(url) {
        var objs = this.get();
        var ajaxWrap;
        for (var i = 0; i < objs.length; i++) {
            ajaxWrap = AjaxWrap(objs[i]).deajaxize();
            if(url)
                ajaxWrap.setUrl(url);
            ajaxWrap.ajaxize();
        }
        return this;
    },

    ajaxAlter: function(url) {
        var objs = this.get();
        for (var i = 0; i < objs.length; i++)
            AjaxWrap(objs[i]).alter(url);
        return this;
    }
});


jQuery.extend({
    ajaxing: function(params) {
        AjaxWrap(params).ajaxing();
    }
});



var AjaxWrap = function (objToWrap, context) {
        return new AjaxWrap.prototype.init(objToWrap, context);
    };


AjaxWrap.ajaxingReceive = function (event) {
    event.data.ajaxWrap.ajaxing(event);
};


AjaxWrap.prototype = {

    init : function(origin, context) {
        // original object reference
        this.origin = origin || {};
        // note: cached means it's valid too
        this.originCache = null;
        // context to call all callbacks with
        this.context = typeof context !== 'undefined' ? context : origin;

        // states of relevant actions
        this.state = {
            //prevents from running more then on request for an object at a time
            isRunning: false,

            // for ajaxing delay
            delayQueue: [],
            delayTimer: 0,

            // for ajaxing animate
            animatedElem: null, // for reference to animated element
            isAnimating: false,
            animationBackup: '' // for element content backup
        };

        return this;
    },


    ajaxing: function (event) {
        event = typeof event !== 'undefined' ? event : null;
        var pipeData = {};

        // If it is debug mode (every input has to be at some time validated)
        // with nothing (validated) in cache and finally the origin is not valid too
        //  -> exit
        // NOTE: with debugMode on and safeMode off ajaxized objects are validated twice
        //       1st time when are ajaxized and 2nd when ajaxing
        if(debugMode && !this.originCache && !this.validate())
            return this;

        if (event) {
            if ((/(click|submit)/).test(event.type))
                event.preventDefault();
            if ((/(ajaxing)/).test(event.type) || !this.propagation(true /* transformed */)) {
                event.stopPropagation();
            }
            // space for to-be-called ajaxing function to pass any parameters using event
            event.data.ajaxing = {};
        }

        // if prepare is specified it must return true, otherwise it's time to leave
        if (this.prepare() && !this.prepare(true /*transformed*/ ).apply(this.context, [event, pipeData]))
            return this;

        // If this object is not already making another query right now.
        if (!this.state.isRunning) {
            // By very default there is no delay
            var delay = 0;
            if(event)
                // If event is given, first, delay is obtained from custom delays conf,
                // if there is no definition for current event, default event delay is taken.
                delay = event.type in customEventsDelays ?
                    customEventsDelays[event.type] : defaultEventsDelay;

            if (delay > 0) // delay >0 , so use delay mechanism
                this.ajaxingDelay(event, pipeData, delay);
            else // delay  == 0, so go directly to ajaxing
                this.ajaxingComplete(event, pipeData);
        }
        return this;
    },

    ajaxingDelay: function (event, pipeData, delay) {
        if (!this.state.delayQueue.length) {
            var that = this;
            var delayFunc = function () //this function uses some variables from further stack: 'that' and 'event'
            {
                // IMPORTANT: check if delay time has past:
                //     yes - clear interval and continue ajaxing,
                //     no - w8 another interval
                if (that.state.delayQueue[that.state.delayQueue.length - 1] + delay < new Date().getTime()) {
                    that.state.delayQueue = []; //we are going to execute this queue now, so clear it
                    clearInterval(that.state.delayTimer); //clear this interval as well
                    that.ajaxingComplete(event, pipeData); //you can do some ajaxing now
                }
            };
            this.state.delayTimer = setInterval(delayFunc, delay);
        }
        this.state.delayQueue.push(new Date().getTime());
    },

    ajaxingComplete: function (event, pipeData) {
        if ( (this.url() == null || (this.request() && !this.request(true))) && this.call() != null) {
            //to stand by the rule that precall is always called
            if (this.precall())
                this.precall(true /*transformed*/ ).apply(this.context, [event, pipeData]);
            //call without HTTP request
            this.call(true /*transformed*/ ).apply(this.context, [null, null, event, pipeData]);
            tools.registerExec(this, event);
            tools.sendAnalyticsEvent(this, event);
        } else { //make HTTP request before calling
            var url = ajaxTemplate.url(this);
            var settings = {};
            for (var param in ajaxTemplate.defaultSettings) {
                if (ajaxTemplate.defaultSettings.hasOwnProperty(param)) {
                    switch (typeof ajaxTemplate.settings[param]) {
                        case 'function':
                            settings[param] = ajaxTemplate.settings[param](this, event, pipeData);
                            break;
                        case 'object':
                            settings[param] = ajaxTemplate.settings[param];
                            break;
                        default:
                            settings[param] = ajaxTemplate.defaultSettings[param];
                            break;
                    }
                }
            }
            // making HTTP REQUEST, this is that moment
            jQuery.ajax(url, settings);
            // after http request, but before response, precall is called
            if (this.precall() != null)
                this.precall(true /*transformed*/ ).apply(this.context, [settings.event, pipeData]);
        }
    },




    ajaxize: function () {
        if(this.origin[ajaxizedIdField]) {
            new ajaxizeError(errors.alreadyAjaxized, this).consoleWarning();
            // each object can be ajaxized only once -> exit
            // (it can be deajaxized or reajaxized though)
            return this;
        }

        if(debugMode && !this.validate())
           // debug mode and not valid -> exit
           return this;

        if(cacheAjaxizedMode)
            // cache ajaxized mode and this valid -> cache
            this.cacheOrigin();

        var declaredEvents = this.events(true /*transformed*/);
        var tagDefaultEvents = 'ajaxing' + ' ';
        if(util.isNode(this.origin)) {
            var tag = this.tagName().toLowerCase();
            if( jQuery.inArray(tag, ['a', 'button']) != -1 ) // inArray == indexOf for ie
                tagDefaultEvents += 'click';
            else if(jQuery.inArray(tag, ['form']) != -1) // inArray == indexOf for ie
                tagDefaultEvents += 'submit';
            else if(jQuery.inArray(tag, ['input', 'select', 'textarea']) != -1) // inArray == indexOf for ie
                tagDefaultEvents += 'keyup change';
        }

        // HERE IS event handles setting
        // add default events and declared ones and make sure they don't repeat == are unique
        var allEvents = jQuery.unique((tagDefaultEvents + ' ' + declaredEvents).split(' ')).join(' ');
        jQuery(this.origin).on(allEvents, null, {'ajaxWrap': this}, AjaxWrap.ajaxingReceive);

        // tie created wrap with ajaxized object
        this.origin[ajaxizedIdField] = deletedAjaxizedIds.pop() || ajaxizedId++;
        ajaxizedCache[this.origin[ajaxizedIdField]] = this;

        if(this.ajaxizeAttr('ajaxize'))
            this.setAjaxizeAttr('ajaxize', 'done');

        return this;
    },

    deajaxize: function () {
        // if it was really ajaxized, deAjaxize it then
        if(!this.origin[ajaxizedIdField])
            return this;

        // clean cache if anything was cached
        this.originCache = null;

        // HERE IS event handles removing
        jQuery(this.origin).off('', null, AjaxWrap.ajaxingReceive);

        // untie created wrap with ajaxized object
        deletedAjaxizedIds.push(this.origin[ajaxizedIdField]);
        ajaxizedCache[this.origin[ajaxizedIdField]] = null;
        // we could set is null or 0, delete might be slower but is cleaner
        delete this.origin[ajaxizedIdField];

        // was it autoAjaxized? restore initial value then!
        if(this.ajaxizeAttr('ajaxize') == 'done')
            this.setAjaxizeAttr('ajaxize', 'do');
        return this;
    },

    reajaxize: function(url) {
        // This is very safe because not ajaxized object
        // can always be deajaxized.
        this.deajaxize();
        if(url)
            this.setUrl(url);
        return this.ajaxize();
    },

    alter: function(url) {
        this.setUrl(url);
        return this;
    },

    get: function(){ return this.origin; },

    getContext: function() { return this.context; },




    cacheOrigin: function() {
        var fields = ['url', 'call', 'precall', 'load', 'append', 'closest',
                      'events', 'animate', 'history', 'request',  'prepare', 'propagation',
                      'tagName', 'method'];
        this.originCache = {};
        for(var i = 0; i < fields.length; i++)
            this.originCache[fields[i]] = this[fields[i]](false /* not transformed */,
                                                          true /* original(not cached) */);
    },



    validate: function () {
        try {
            this.validateCore();
            this.validateFunctions();
            this.validateSelectors();
            this.validateParameters();
            this.validateConsistency();

            return true;
        } catch (error) {
            if (error instanceof ajaxizeError) {
                if(this.dispatchAjaxizeAttr('ajaxize'))
                    this.setAjaxizeAttr('ajaxize', 'invalid');
                error.consoleError();
                return null;
            }
            throw error;
        }
    },

    validateCore: function() {
        if(typeof this.origin === 'undefined' || typeof this.origin === 'function')
            throw new ajaxizeError(errors.badCore, this);
    },

    validateFunctions: function () {
        var funcNames = [
            this.prepare, this.call,
            this.precall
        ];
        for ( var i = 0; i < funcNames.length; i++ ) {
            if (funcNames[i].apply(this) != null &&
                    typeof funcNames[i].apply(this, [true /*transformed*/]) !== 'function' )
                throw new ajaxizeError(util.str(errors.badFunction, funcNames[i].apply(this)), this);
        }
    },

    validateSelectors: function () {
        //Are those selectors valid?
        if (this.closest() != null && !this.closest(true /* transformed */))
            throw new ajaxizeError(util.str(errors.badClosestSelector, this.closest()), this);

        var selectStrings = [
            this.load,
            this.append
        ];
        for (var i = 0; i < selectStrings.length; i++) {
            if (selectStrings[i].apply(this) && !selectStrings[i].apply(this, [true /* transformed */]))
                throw new ajaxizeError(util.str(errors.badSelector, selectStrings[i].apply(this)), this);
        }
    },

    validateParameters: function () {
        var i;
        // event parameters
        if (this.events()) {
            var events = this.events(true /*transformed*/).split(' ');
            for (i = 0; i < events.length; i++)
                if (!eventRegex.test(events[i]))
                    throw new ajaxizeError(util.str(errors.badEvents, events[i]), this);
        }
        // all other parameters
        var paramStrings = [{
            value: this.history(false, true) /* not transformed and original */ , params: ['true', 'false']
        }, {
            value: this.animate(false, true) /* not transformed and original  */, params: ['true', 'false']
        }, {
            value: this.request(false, true) /* not transformed and original  */, params: ['true', 'false', 'post', 'get']
        }];
        for (i = 0; i < paramStrings.length; i++) {
            if (paramStrings[i].value) {
                var found = false;
                paramStrings[i].value.toLowerCase();
                for (var j = 0; j < paramStrings[i].params.length; j++) {
                    if (paramStrings[i].value == paramStrings[i].params[j]) {
                        found = true;
                        break;
                    }
                }
                if (!found)
                    throw new ajaxizeError(util.str(errors.badParams, paramStrings[i].value), this);
            }
        }
    },

    validateConsistency: function () {
        //Either call function or load selector must be set (both at a time can be as well)
         if(! (this.load() || this.append() || this.call()))
            throw new ajaxizeError(errors.noOptionSet, this);

        //If load or append mode, appropriate attribute containing url must be set, and ajaxize request can't be false
        if ((this.load() || this.append()) && (!this.url() || (this.request() && !this.request(true))))
            throw new ajaxizeError(errors.noUrl, this.origin);

        //If form url set, method has to be set as well
        if (this.tagName() && this.tagName().toLowerCase() == 'form' && this.url() && (
            !this.method() || (
                this.method().toLowerCase() != 'get' &&
                this.method().toLowerCase() != 'post'
                )
            )
        )
            throw new ajaxizeError(errors.badMethod, this);
    },



    'href': function (transformed, original) {
        return this.dispatchAttr('href', transformed, original);
    },
    'action': function (transformed, original) {
        return this.dispatchAttr('action', transformed, original);
    },
    'method': function (transformed, original) {
        return this.dispatchAttr('method', transformed, original);
    },
    'tagName': function(transformed, original) {
        if(this.originCache && !original)
            return this.originCache.tagName;
        return typeof this.origin.tagName !== 'undefined' ? this.origin.tagName : null;
    },
    'url': function (transformed, original) {
        var val = util.firstNotNull(
            [this.dispatchAttr, this, ['action', transformed, original]],
            [this.dispatchAttr, this, ['href', transformed, original]],
            [this.dispatchAjaxizeAttr, this, ['url', transformed, original]]
        );
        return (val && val.indexOf('#') == 0) ? null : val;
    },

    serializeChildren: function (){
        if(util.isNode(this.origin)) {
            var serializable = ['form', 'input', 'button', 'select', 'textarea'],
                tagName = this.tagName();
            if (tagName && jQuery.inArray(tagName.toLowerCase(), serializable) != -1) // inArray == indexOf for ie
                return jQuery(this.origin).serialize();
        }
        return '';
    },

    'events': function (transformed, original) {
        return this.ajaxizeStrAttr('events', transformed, original);
    },
    'propagation': function(transformed, original) {
        return this.ajaxizeBoolAttr('propagation', transformed, original, true);  // default value is true
    },
    'history': function (transformed, original) {
        return this.ajaxizeBoolAttr('history', transformed, original);
    },
    'animate': function (transformed, original) {
        return this.ajaxizeBoolAttr('animate', transformed, original);
    },
    'request': function (transformed, original) {
        return this.ajaxizeChoiceAttr('request', transformed, original, {
                'post': 'post',
                'get': 'get',
                'true': 'get',
                'false': false
            });
    },

    'prepare': function (transformed, original) {
        return this.ajaxizeFuncAttr('prepare', transformed, original);
    },
    'call': function (transformed, original) {
        return this.ajaxizeFuncAttr('call', transformed, original);
    },
    'precall': function (transformed, original) {
        return this.ajaxizeFuncAttr('precall', transformed, original);
    },


    'closest': function (transformed, original) {
        return this.ajaxizeSelectAttr('closest', transformed, original);
    },
    'load': function (transformed, original) {
        return this.ajaxizeSelectAttr('load', transformed, original);
    },
    'append': function (transformed, original) {
        return this.ajaxizeSelectAttr('append', transformed, original);
    },


    ajaxizeChoiceAttr: function(attrName, transformed, original, choices) {
        var val = this.dispatchAjaxizeAttr(attrName, transformed,  original);
        if(!transformed)
            return val;

        if (typeof val !== 'string')
            val = String(val);
        val = choices[val.toLowerCase()];
        return typeof val !== 'undefined' ? val : null
    },


    ajaxizeFuncAttr: function(attrName, transformed, original) {
        var val = this.dispatchAjaxizeAttr(attrName, transformed,  original);
        if(!transformed)
            return val;
        if(typeof val === 'function')
            return val;
        if(typeof val === 'string') {
            return util.resolveName(val, ajaxing);
        }
        return null;
    },

    ajaxizeSelectAttr: function (attrName, transformed, original) {
        var val = this.dispatchAjaxizeAttr(attrName, transformed,  original);
        if(!transformed)
            return val;

        if(attrName == 'closest')
            val = jQuery(this.context).closest(val).get(0);
        else
            // We assume this.closest() is valid (the closest element can be found),
            // this assumption means closest HAS TO BE VALIDATED during validation AS FIRST SELECTOR
            if(val == 'closest' || val == 'this')
                if(this.closest())
                    val = this.closest(true /* transformed */ );
                else
                    val = this.origin;
            else if( this.closest() )
                val = jQuery(this.closest(true /* transformed */ )).find(val);
            else
                val = jQuery(val).get(0);

        return typeof val !== 'undefined' ? val : null
    },

    ajaxizeStrAttr: function (attrName, transformed, original) {
        var val = this.dispatchAjaxizeAttr(attrName, transformed, original);
        if (!transformed)
            return val;

        return val || '';
    },

    ajaxizeBoolAttr: function (attrName, transformed, original, defaultValue) {
        var val = this.dispatchAjaxizeAttr(attrName, transformed, original);
        if (!transformed)
            return val;

        if (typeof val === 'string')
            return val.toLowerCase() == 'true';
        if (typeof val === "boolean")
            return val;
        return (typeof defaultValue === 'undefined' ? false : defaultValue) || false;  //if defaultValue is undefined return false, if false, return false
    },

    dispatchAttr: function(attrName, transformed, original) {
        // transformed is the same as !transformed in that case
        if(this.originCache && !original)
            return this.originCache[attrName];
        if(this.origin.tagName)
            return this.origin.getAttribute(attrName);
        if(typeof this.origin[attrName] != 'undefined')
            return this.origin[attrName];
        return null;
    },

    dispatchAjaxizeAttr: function(attrName, transformed, original) {
        // transformed is the same as !transformed in that case
        if(this.originCache && !original)
            return this.originCache[attrName];
        if(util.isNode(this.origin))
            return this.ajaxizeAttr(attrName);
        if(typeof this.origin[attrName] !== 'undefined')
            return this.origin[attrName];
        return null;
    },

    ajaxizeAttr: function (attrName) {
        attrName = (attrName && attrName != ajaxizeAttr) ? attrGlue + attrName : '';
        return this.origin.getAttribute(attrPrefix + attrName);
    },




    setUrl: function(value) {
        switch(this.tagName()) {
            case 'form':
                this.setAttr('action', value); break;
            case 'a':
                this.setAttr('href', value); break;
            default:
                this.setAjaxizeAttr('url', value); break;
        }

    },

    setAttr: function(attrName, value) {
        if(util.isNode(this.origin))
            this.origin.setAttribute(attrName, value);
        else
            this.origin[attrName] = value;
    },

    setAjaxizeAttr: function (attrName, value) {
        if( util.isNode(this.origin)) {
            attrName = (attrName && attrName != ajaxizeAttr) ? attrGlue + attrName : '';
            this.origin.setAttribute(attrPrefix + attrName, value);
        } else
            this.origin[attrName] = value;
    }
};


AjaxWrap.prototype.init.prototype = AjaxWrap.prototype;




var ajaxTemplate = {
        'url': function (ajaxWrap, if_prefix) {
            var url = ajaxWrap.url();
            if_prefix = typeof if_prefix == 'undefined' ? true : if_prefix;
            if_prefix = if_prefix && url.indexOf(urlPrefix) != 0;

            if(url != null) {
                url = (if_prefix ? urlPrefix : '') + url;
                // adding ajaxize_unqiue parameter to prevent us from getting response cached by browser
                url += url.indexOf('?') == -1 ? '?' : '&';
                url += '_ajaxize=' + new Date().getTime().toString();
            }

            return url;
        }, //ajax.url

        'settings': {
            'type': function (ajaxWrap, event, pipeData) {
                if(ajaxWrap.tagName() && ajaxWrap.tagName().toLowerCase() == 'form')
                    return ajaxWrap.method().toUpperCase();
                var requestMethod = ajaxWrap.request(true);
                if( requestMethod )
                    return requestMethod.toUpperCase();
                return 'GET';
            },

            'data': function (ajaxWrap, event, pipeData) {
                var data = ajaxWrap.serializeChildren(),
                    val = '';
                if((ajaxWrap.method() == 'post' || (!ajaxWrap.method() && ajaxWrap.request(true) == 'post'))
                        && data.indexOf(csrfVarName + '=') == -1) {
                    val = util.resolveName(csrfGetter);
                    if( typeof val === 'function')
                        val = val();
                }
                if(val) {
                    val = [csrfVarName, '=', val].join('');
                }
                return (val && data) ? [data, '&', val].join('') : (data || val);
            },

            'context': function (ajaxWrap, event, pipeData) {
                return ajaxWrap.context;
            },

            'dataType': function (ajaxWrap, event, pipeData) {
                //if either load or append is set, response type is html, otherwise json
                if( ajaxWrap.load() || ajaxWrap.append())
                    return 'html';
                return 'json';
            },

            'beforeSend': function (ajaxWrap, event, pipeData) {
                return function (jqXHR, settings) {
                    if (ajaxWrap.animate())
                        tools.animate(ajaxWrap, true);
                    ajaxWrap.state.isRunning = true;
                    return true;
                };
            },

            'success': function (ajaxWrap, event, pipeData) {
                return function (data, textStatus, jqXHR) {
                    var ajaxizeParams;
                    // data.ajaxize is namespace reserved for passing ajaxize parameters
                    if(typeof data === 'object' )
                        ajaxizeParams = data.ajaxize;
                    // never ever trust anybody, check content type, as it might differ from requested type
                    else if(typeof data === 'string' && /json/.test(jqXHR.getResponseHeader('Content-Type')))
                        try {
                            ajaxizeParams = JSON.parse(data).ajaxize;
                        } catch (SyntaxError) {}
                    if (typeof ajaxizeParams != 'undefined') {
                        if (typeof ajaxizeParams.redirect !== 'undefined')
                            // server wants us to redirect with page reloading
                            window.location.replace(ajaxizeParams.redirect);
                        else if (typeof ajaxizeParams.reload !== 'undefined' && ajaxizeParams.reload) {
                            // server wants us to reload current page
                            window.location.reload();
                        }
                    }

                    // switching off isRunning pointer and animation
                    ajaxWrap.state.isRunning = false;
                    tools.animate(ajaxWrap, false);

                    // THAT'S HERE loading/appending/calling
                    var args = null,
                        method = (ajaxWrap.load() ? 'html' : null) ||
                                 (ajaxWrap.append() ? 'append' : null);
                    if(method)  {
                        var target = ajaxWrap.load(true /* transformed */) || ajaxWrap.append(true /* transformed */);
                        target = jQuery(target).first();
                        target[method](data);

                        args = [target.get(0), null, event, pipeData];
                    } else
                        args = [null, data, event, pipeData];
                    if(ajaxWrap.call())
                        ajaxWrap.call(true /*transformed*/ ).apply(ajaxWrap.context, args);

                    if (ajaxWrap.history()) // if history saving option is active, save it
                        tools.history(ajaxWrap.url(), ajaxWrap.serializeChildren());
                    //are there any new objects to be ajaxized? - lets check
                    ajaxize.autoAjaxize();
                    //let's call all functions registered for calling after ajaxing anything
                    tools.registerExec(ajaxWrap, event);
                    tools.sendAnalyticsEvent(ajaxWrap, event);
                };
            },

            'error': function (ajaxWrap, event,pipeData) {
                return function (jqXHR, textStatus, errorThrown) {
                    ajaxWrap.state.isRunning = false;
                    tools.animate(ajaxWrap, false);
                    if (errorThrown != null) {
                        new ajaxizeError(util.str(errors.jQueryFatal, errorThrown), ajaxWrap).consoleError();
                    } else
                        new ajaxizeError(util.str(errors.ajaxFatal, jqXHR.status, jqXHR.statusText, ajaxTemplate.url(ajaxWrap)),
                                  ajaxWrap).consoleError();
                };
            },

            'event': function (ajaxWrap, event, pipeData) {
                return event;
            },

            'timeout': function (ajaxWrap, event, pipeData) {
                return timeout;
            }

        }, //ajax.settings

        'defaultSettings': {
            //key settings
            'dataType': 'html',
            'type': 'GET',
            'data': '',
            'context': window,
            'success': function () {},
            'error': function () {},
            'beforeSend': function () {},
            //extra ones
            'async': true,
            'contentType': 'application/x-www-form-urlencoded; charset=UTF-8',
            'crossDomain': false,
            'timeout': 10000, //100s
            //just for passing calling event
            'event': null
        } //ajax.defaultSettings

    }; //ajax




var tools = {
        'animate': function (ajaxWrap, animate) {
            if (ajaxWrap.state.isAnimating && !animate) {
                ajaxWrap.state.animatedElem.html(ajaxWrap.state.animationBackup);
                ajaxWrap.state.isAnimating = false;
                ajaxWrap.state.animatedElem = null;
            } else if (!ajaxWrap.state.isAnimating && animate) {

                if (ajaxWrap.load())
                    ajaxWrap.state.animatedElem = jQuery(ajaxWrap.load(true /* transformed */));
                else if (ajaxWrap.append())
                    ajaxWrap.state.animatedElem = jQuery(ajaxWrap.append(true /* transformed */));

                if (ajaxWrap.state.animatedElem) {
                    ajaxWrap.state.isAnimating = true;
                    ajaxWrap.state.animationBackup = ajaxWrap.state.animatedElem.html();
                    ajaxWrap.state.animatedElem.html('loading...');
                }
            }
        },

        'history': function (url, getData) {
            getData = getData ? (url.indexOf('?') == -1 ? '?' : '&') + getData : '';
            window.history.pushState({
                'data': getData,
                'url': url + getData
            }, "", url + getData);
            window.onpopstate = function (e) {
                window.location.assign(document.location)
            };
        },
        'registerExec': function(ajaxWrap, event) {
              for (var func in registered)
                    if (registered.hasOwnProperty(func) &&
                            typeof registered[func] == 'function')
                        registered[func].apply(ajaxWrap.context, [event]);
        },
        'sendAnalyticsEvent': function(ajaxWrap, event) {
            if(!sendAnalyticsEvent)
                return;
            if(typeof ga === 'undefined')
                return;
            if(!event || jQuery.inArray(event.type, ['click', 'submit', 'change', 'keyup']) == -1)
                return;
            var $origin = jQuery(ajaxWrap.origin),
                calledFunc = (ajaxWrap.call() || (ajaxWrap.load() ? 'load' : '') || 'no func:') + ': ',
                contentLabel = $origin.text().trim().substring(0, 100),
                targetLabel = $origin.attr('class'),
                label = contentLabel || targetLabel || 'no label';
            ga('send', 'event', 'AJAX', event.type, calledFunc + label);
        }
    }, //tools

    util = {
        resolveName: function (strObjName, namespace) {
            if (typeof strObjName != 'string')
                return null;
            var parts = strObjName.split(".");
            for (var i = 0, len = parts.length, obj = namespace ? namespace : window; i < len; ++i) {
                if (typeof obj === 'undefined' || obj == null)
                    break;
                obj = obj[parts[i]];
            }
            return obj;
        },

        firstNotNull: function() {
            var args = Array.prototype.slice.apply(arguments);
            var argsSet,
                val = null;
            while(args.length){
                argsSet = args.shift();
                if(typeof argsSet[0] == "function")
                    val = argsSet[2] ? argsSet[0].apply(argsSet[1], argsSet[2]) : argsSet[0].apply(argsSet[1]);
                else
                    val = argsSet[0];
                if(val != null)
                    break;
            }
            return val;
        },

        str: function() {
            var str = arguments[0] || '',
                i = 1;
            for(; i < arguments.length; i++)
                str = str.replace('%s', arguments[i]);
            return str;
        },

        isNode: function(obj) {
            return obj && obj.nodeType;
        }

    }, //supporting functions

    errors = {
        badFunction: "can't find function 'ajaxing.%s'",
        badSelector: "no objects found for '%s' selector",
        badClosestSelector: "no objects found for '%s' closest selector",
        badEvents: "invalid ajaxize_events value, it must be a space separated list " +
                         "of events set in customEvents setting, stopped at '%s'",
        badMethod: "invalid form method, possible values are GET and POST",
        badParams: "incorrect '%s' parameter",
        noOptionSet: "either ajaxize call, load or append has to be specified",
        noUrl: "no url source defined or invalid request=false setting, url source can be: " +
               "href for a, action for form, ajaxize url for other accepted tags",
        badCore: 'given origin is undefined or function',
        jQueryFatal: "jQuery response processing error: '%s'",
        ajaxFatal: "making request failed with status %s %s '%s'",
        alreadyAjaxized: 'already ajaxized',
        template: "AJAXize: %s. At tag/object:"
    };




var ajaxizeError = function (msg, at) {
        this.msg = msg;
        this.at = at;
    };

ajaxizeError.prototype = new Error;

ajaxizeError.prototype.consoleError = function () {
    var context = this.at.origin != this.at.context ?
                  this.printObj(this.at.context) :
                  '';
    try {
        console.error(
            util.str(errors.template, this.msg),
            this.printObj(this.at.origin),
            context
        );
    } catch (e){} // for IE no console

};

ajaxizeError.prototype.consoleWarning = function () {
    var context = this.at.origin != this.at.context ?
                  this.printObj(this.at.context) :
                  '';
    try {
        console.warn(
            util.str(errors.template, this.msg),
            this.printObj(this.at.origin),
            context
        );
    } catch (e){} // for IE no console
};


ajaxizeError.prototype.toString = function() {
    return this.msg;
};

ajaxizeError.prototype.printObj = function(obj) {
    return util.isNode(obj) ? jQuery(obj).prop('outerHTML') : obj;
};



window.ajaxize = ajaxize;
window.ajaxing = ajaxing;
window.AjaxWrap = AjaxWrap;

})(window);

jQuery(ajaxize.autoAjaxize);
