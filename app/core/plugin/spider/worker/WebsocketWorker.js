var AbstractWorker = require(CORE_PATH + '/plugin/spider/AbstractWorker.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    WebsocketClient = require('websocket').client,
    util = require('util');
    
var WebsocketWorker = function(options) {
    WebsocketWorker.super_.call(this, options);
    
    var _defaultOptions = { 'uri': '', opts: {} }
    this.options = _.extend(_defaultOptions, this.options);
    
    /* ---------------------------------------------------------------------- */
    
    var _ws = null,
        _wsConnection = null;
    
    /* ---------------------------------------------------------------------- */

    this.start = function(_next)
    { 
        var self = this;
        
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            _ws = new WebsocketClient();
            _ws.on('connect', function(conn) {
                logger.debug('Open connection "' + self.options.uri + '"', self);
                _wsConnection = conn;
                
                conn.on('message', function(data) {
                    if(data.type === 'utf8' && data.utf8Data.length > 0) {
                        self.options.collect(data.utf8Data);
                    }
                });
                conn.on('error', function(error) {
                    logger.error(error, self);
                });
                conn.on('close', function() {
                    logger.debug('Close connection "' + self.options.uri + '"', self);
                });
                
                _eventNext();
            });
            _ws.on('connectFailed', function(err) {
                logger.error(err, self);
            });
            _ws.connect(self.options.uri, self.options.opts);
        }, _next);
    };
    
    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            _wsConnection.close();
            _eventNext();
        }.bind(this), _next);
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.getWebsocket = function() { return _ws; };
    this.getWebsocketConnection = function() { return _wsConnection; }
}

util.inherits(WebsocketWorker, AbstractWorker);
WebsocketWorker.prototype.className = 'core.plugin.spider.worker.Websocket';

module.exports = WebsocketWorker;