var AbstractWorker = require(CORE_PATH + '/plugin/spider/AbstractWorker.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    util = require('util');
    
var SocketIOWorker = function(options) {
    SocketIOWorker.super_.call(this, options);
    
    var _defaultOptions = { 'uri': '', opts: {}, 'libraryVersion': '0.9', 'eventName': 'message' }
    this.options = _.extend(_defaultOptions, this.options);
    
    /* ---------------------------------------------------------------------- */
    
    var _ws = null;
    
    /* ---------------------------------------------------------------------- */

    this.start = function(_next)
    { 
        var self = this;
        
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            var socketIOClient = require('socket.io-client@' + self.options.libraryVersion);
            _ws = socketIOClient.connect(self.options.uri, self.options.opts);
            _ws.on('connect', function() {
                logger.debug('Open connection "' + self.options.uri + '"', self);
                _eventNext();
            });
            _ws.on(self.options.eventName, function(data) {
                self.options.collect(data);
            });
            _ws.on('error', function(error) {
                logger.error(error, self);
            });
            _ws.on('reconnect', function() {
                logger.debug('Reconnect "' + self.options.uri + '"', self);
            });
            _ws.on('disconnect', function() {
                logger.debug('Close connection "' + self.options.uri + '"', self);
            });
        }, _next);
    };
    
    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            if(!_.isNull(_ws)) {
                _ws.disconnect();
            }
            _eventNext();
        }.bind(this), _next);
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.getWebsocket = function() { return _ws; };
}

util.inherits(SocketIOWorker, AbstractWorker);
SocketIOWorker.prototype.className = 'core.plugin.spider.worker.SocketIO';

module.exports = SocketIOWorker;