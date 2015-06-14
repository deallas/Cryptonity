var Options = require(CORE_PATH + '/Options.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js'),
    util = require('util'),
    async = require('async'),
    events = require('events');

var ObjectLifetime = function(options)
{
    ObjectLifetime.super_.call(this);
    extUtil.implements(this, Options);

    var defaultOptions = {
        syncEvents: {
            preConfigure:       [],
            postConfigure:      [],
            preStart:           [],
            postStart:          [],
            preStop:            [],
            postStop:           []
        },
        asyncEvents: {
            preConfigure:       [],
            postConfigure:      [],
            preStart:           [],
            postStart:          [],
            preStop:            [],
            postStop:           []        
        }
    };

    if(_.isObject(options)) {
        if(_.isObject(options.syncEvents)) {
            defaultOptions.syncEvents = _.extend(defaultOptions.syncEvents, options.syncEvents);
            delete options.syncEvents;
        }
        if(_.isObject(options.asyncEvents)) {
            defaultOptions.asyncEvents = _.extend(defaultOptions.asyncEvents, options.asyncEvents);
            delete options.asyncEvents;
        }
    }

    this.appendOptions(defaultOptions);
    if(_.isObject(options)) {
        this.appendOptions(options);
    }
   
    _.each(_.keys(defaultOptions.asyncEvents), function(eventName) {
        if(_.isArray(this.options.asyncEvents[eventName])) {
            _.each(this.options.asyncEvents[eventName], function(eventBody) {
                this.on(eventName, eventBody);
            }.bind(this));
        } else if(_.isFunction(this.options.asyncEvents[eventName])) {
            this.on(eventName, this.options.asyncEvents[eventName]);
        }
    }.bind(this));
    
    _.each(_.keys(defaultOptions.syncEvents), function(eventName) {
        if(!_.isArray(this.options.syncEvents[eventName])) {
            this.options.syncEvents[eventName] = [ this.options.syncEvents[eventName] ];
        }
    }.bind(this));

    /* ---------------------------------------------------------------------- */

    this.isConfigure        = false;
    this.isStart            = false;
    this.isStop             = false;
    this.isRunningConfigure = false;
    this.isRunningStart     = false;
    this.isRunningStop      = false;
    
    
    var _parent             = null,
        _childs             = {};
    
    /* ---------------------------------------------------------------------- */

    this.configure = function(_next) 
    {
        _next = _next || function() {};
        this.executeEvent('configure', null, _next);  
    };
    
    this.start = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('start', null, _next);
    };
    
    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', null, _next);
    };
    
    this.restart = function(_next)
    {
        if(this.isStart) {
            this.stop(function() {
                this.start(_next);
            }.bind(this)); 
        } else {
            this.start(_next);
        }
    };
    
    this.toggle = function(_next)
    {
        if(this.isStart) {
            this.stop(_next);
        } else {
            this.start(_next);
        }
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.getDependency = function(dependencyName) {
        if(_.isNull(_parent)) {
            throw new Error('Parent is not defined');
        }
        
        return _parent.getChild(dependencyName);
    };
    
    this.setParent = function(parent, force) {
        if(!(parent instanceof ObjectLifetime)) {
            throw new Error('Object does not extend ObjectLifetime');
        }
        
        if(!_.isNull(_parent)) {
            if(!force) {
                throw new Error('Parent has been already defined');
            }
            _parent.unbindChild(this.className);
        }
        
        logger.debug('Set parent "' + parent.className + '"', this);
        _parent = parent; 
    };
    
    this.clearParent = function() {
        logger.debug('Clear parent', this);
        
        if(_.isNull(_parent)) {
            return false;
        }
        _parent = null;
        
        return true;
    };
    
    this.getChild = function(childName)
    {
        if(_.isUndefined(_childs[childName])) {
            throw new Error('Child "' + childName + '" does not exists in object "' + this.className + '"');
        }
        
        return _childs[childName];
    };
    
    this.bindChild = function(childName, child, force)
    {
        if(!(child instanceof ObjectLifetime)) {
            throw new Error('Object does extend ObjectLifetime');
        }
        
        force = !!force;
        if(!_.isUndefined(_childs[childName])) {
            if(!force) {
                throw new Error('Cannot override child "' + child.className + '" for "' + this.className + '"');
            }
        }
        
        logger.debug('Bind child "' + child.className + '"', this);
        child.setParent(this);
        _childs[childName] = child;
    };
    
    this.unbindChild = function(childName)
    {
        logger.debug('Unbind child "' + childName + '"', this);
        if(!_.isUndefined(_childs[childName])) {
            _childs[childName].clearParent();
            _childs[childName] = null;
            return true;
        }
        
        return false;
    };
    
    this.unbindChilds = function()
    {
        logger.debug('Unbind all childs', this);
        
        _.each(_.keys(_childs), function(k) {
            _childs[k].clearParent();
        });
        _childs = {};
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.executeChildsEvent = function(_eventName, _callback)
    {
        _eventName = _eventName.toLowerCase();
        _eventName = _eventName.substr(0,1).toUpperCase() + _eventName.substr(1);
        
        logger.debug('Running childs event "' + _eventName + '"', this);
        async.auto(_getChildsExec(_eventName.toLowerCase()), _callback);
    };
    
    this.executeEvent = function(_eventName, _eventBody, _callback)
    {
        if(_.isNull(_eventBody) || _.isUndefined(_eventBody)) {
            _eventBody = function(_next) { _next() };
        }
        
        _eventName = _eventName.toLowerCase();
        _eventName = _eventName.substr(0,1).toUpperCase() + _eventName.substr(1);

        logger.debug('Running event "' + _eventName + '"', this);

        if (this['isRunning' + _eventName]) {
            switch(_eventName) {
                case 'start':
                    logger.warn('Object has been already started', this);
                    break;
                case 'stop':
                    logger.warn('Object has been already stopped', this);
                    break;
                case 'configure':
                    logger.warn('Object has been already configured', this);
                    break;
            }

            _callback();
            return;
        }

        if(_eventName === 'Start' && this.isRunningStop) {
            logger.warn('Object is stopping now', this);
        } else if(_eventName === 'Stop' && this.isRunningStart) {
            logger.warn('Object is starting now', this);
        }
        this['isRunning' + _eventName] = true;
        
        logger.debug('Running asyncEvent pre' + _eventName, this);
        this.emit('pre' + _eventName);
        
        logger.debug('Running syncEvent pre' + _eventName, this);
        async.parallel(this.options.syncEvents['pre' + _eventName], function() {
            logger.debug('Running event "' + _eventName + '"', this);
            _eventBody(function() {
                logger.debug('Running childs event "' + _eventName + '"', this);
                async.auto(
                    _getChildsExec(_eventName.toLowerCase()),
                    function() {
                        logger.debug('Running asyncEvent post' + _eventName, this);
                        this.emit('post' + _eventName);

                        logger.debug('Running syncEvent post' + _eventName, this);
                        async.parallel(this.options.syncEvents['post' + _eventName], function() {
                            this['isRunning' + _eventName] = false;
                            this['is' + _eventName] = true;
                            if(_eventName === 'Start') {
                                this.isStop = false;
                            } else if(_eventName === 'Stop') {
                                this.isStart = false;
                            }

                            _callback(); 
                        }.bind(this));
                    }.bind(this)
                );
            }.bind(this));
        }.bind(this));
    };
    
    /* ---------------------------------------------------------------------- */
    
    var _getChildsExec = function(funcName)
    {
        var funcs = {};

        _.each(_.keys(_childs), function(name) {
            var res = _childs[name],
                resDep = [];

            if(_.isArray(res.dependencies)) {
                resDep = _.clone(res.dependencies);
            }
            resDep.push(function(callback) {
                res[funcName](callback)
            });

            funcs[name] = resDep;
        }.bind(this));

        return funcs;
    }
}

util.inherits(ObjectLifetime, events.EventEmitter);
ObjectLifetime.prototype.className = 'core.ObjectLifetime';
ObjectLifetime.prototype.dependencies = [];

module.exports = ObjectLifetime;