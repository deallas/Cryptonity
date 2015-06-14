var AbstractWorker = require(CORE_PATH + '/plugin/spider/AbstractWorker.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    Pusher = require('pusher-client'),
    util = require('util');
    
var PusherWorker = function(options) {
    PusherWorker.super_.call(this, options);
    
    var _defaultOptions = { 'apiKey': '', opts: {}, 'channel': '', 'name': '' }
    this.options = _.extend(_defaultOptions, this.options);
    
    /* ---------------------------------------------------------------------- */

    var _pusher = null,
        _pusherChannel = null;
    
    /* ---------------------------------------------------------------------- */

    this.start = function(_next)
    { 
        var self = this;
        
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            _pusher = new Pusher(self.options.apiKey, self.options.opts);
            _pusherChannel = _pusher.subscribe(self.options.channel);
            _pusherChannel.bind(self.options.name, self.options.collect); 
            _eventNext();
        }, _next);
    };
    
    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            _pusher.unsubscribe(this.options.channel);
            _eventNext();
        }.bind(this), _next);
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.getPusher = function() { return _pusher; };
    this.getPusherChannel = function() { return _pusherChannel; };
}

util.inherits(PusherWorker, AbstractWorker);
PusherWorker.prototype.className = 'core.plugin.spider.worker.Pusher';

module.exports = PusherWorker;