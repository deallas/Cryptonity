var AbstractWorker = require(CORE_PATH + '/plugin/spider/AbstractWorker.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    PubNub = require('pubnub'),
    util = require('util');
    
var PubnubWorker = function(options) {
    PubnubWorker.super_.call(this, options);
    
    var _defaultOptions = {
        'publishKey': '',
        'subscribeKey': '',
        'origin': '',
        'ssl': false
    }
    this.options = _.extend(_defaultOptions, this.options);
    
    /* ---------------------------------------------------------------------- */
    
    var _pubnub;
    
    /* ---------------------------------------------------------------------- */
    
    this.configure = function(_next)
    { 
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            _pubnub = PubNub.init({
                'publish_key': this.options.publishKey,
                'subscribe_key': this.options.subscribeKey,
                'origin': this.options.origin,
                'ssl': this.options.ssl
            });
            _eventNext();
        }.bind(this), _next);
    };
    
    this.start = function(_next)
    { 
        var self = this;
        
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            _pubnub.subscribe({
                channel: this.options.channel,
                connect: function() {
                    _eventNext();
                },
                error: function(err) {
                    logger.error(err, self);
                },
                callback: function(message) {
                    this.options.collect(message);
                }.bind(this)
            });
        }.bind(this), _next);
    };
    
    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            _pubnub.unsubscribe({
                channel: this.options.channel
            });
            _eventNext();
        }.bind(this), _next);
    };
}

util.inherits(PubnubWorker, AbstractWorker);
PubnubWorker.prototype.className = 'core.plugin.spider.worker.Pubnub';

module.exports = PubnubWorker;