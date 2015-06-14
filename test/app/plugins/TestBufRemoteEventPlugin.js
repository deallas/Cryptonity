var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    util = require('util');

var TestBufRemoteEventPlugin = function(options) 
{
    TestBufRemoteEventPlugin.super_.call(this, options);
    
    var _bufRemoteEvent = null,
        _counter = 0,
        _counter2 = 0,
        _workers = [];
    
    /* ---------------------------------------------------------------------- */

    this.configure = function(_next)
    {        
        var self = this;
        
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            _bufRemoteEvent = this.getDependency('resources.BufRemoteEvent');
            
            var funcs = [];
            funcs.push(function(_subscriberNext) {
                _bufRemoteEvent.addSubscriber('test_timer', 'test_timer_1', true, function(data) {
                    logger.debug('[ ' + self.className + ' ] "test_timer_1" - Receive data from channel test_timer: ' + JSON.stringify(data));
                }, function(err) {
                    if(err) {
                        logger.warn(err, self);
                    }
                    _subscriberNext();
                });
            });
            
            funcs.push(function(_subscriberNext) {
                _bufRemoteEvent.addSubscriber('test_timer', 'test_timer_2', true, function(data) {
                    logger.debug('[ ' + self.className + ' ] "test_timer_2" - Receive data from channel test_timer: ' + JSON.stringify(data));
                }, function(err) {
                    if(err) {
                        logger.warn(err, self);
                    }
                    _subscriberNext();
                });
            });
            
            funcs.push(function(_subscriberNext) {
                _bufRemoteEvent.addSubscriber('test_timer2', 'test_timer2_1', true, function(data) {
                    logger.debug('[ ' + self.className + ' ] "test_timer2_1" - Receive data from channel test_timer2: ' + JSON.stringify(data));
                }, function(err) {
                    if(err) {
                        logger.warn(err, self);
                    }
                    _subscriberNext();
                });
            });
            
            async.parallel(funcs, _eventNext);
        }.bind(this), _next);
    };
    
    this.start = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            _workers[0] = setInterval(function() {
                _bufRemoteEvent.appendData('test_timer', ++_counter, null, _counter % 5 === 0);
            }, 1000);
            _workers[1] = setInterval(function() {
                _bufRemoteEvent.appendData('test_timer2', ++_counter2, null, _counter2 % 3 === 0);
            }, 2000);
            _eventNext();
        }.bind(this), _next);
    };
    
    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            clearInterval(_workers[0]);
            clearInterval(_workers[1]);
            _eventNext();
        }.bind(this), _next);
    };
}

util.inherits(TestBufRemoteEventPlugin, AbstractPlugin);
TestBufRemoteEventPlugin.prototype.className = 'plugins.TestBufRemoteEvent';
TestBufRemoteEventPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = TestBufRemoteEventPlugin;