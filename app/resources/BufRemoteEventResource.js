var AbstractResource = require(CORE_PATH + '/AbstractResource.js'),
    extUtil = require(CORE_PATH + '/Utils.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    util = require('util'),
    redis = require('redis'),
    async = require('async'),
    fs = require('fs');

var BufRemoteEventResource = function(options)
{    
    BufRemoteEventResource.super_.call(this, options);
    
    var _defaultOptions = {
        'maxSubscribers' :      10,
        'maxSegmentTime' :      60*60*1000, // 1h - miliseconds
        'maxSegmentLifetime' :  60*60*24*7, // week - seconds
        'maxSegmentElements' :  100
    };
    
    this.options = _.extend(_defaultOptions, this.options);
    
    /* ---------------------------------------------------------------------- */
    
    var _clientPublisher = null,
        _clientSubscriber = null,
        _subscribers = {},
        _luaScripts = {
            'appendData': "\n\
                local lastSegmentNumber, lastSegmentTimestamp = unpack(redis.call('zrange', 'channel_' .. KEYS[1] .. '_segments', -1, -1, 'WITHSCORES'))\n\
                local segmentTimestamp = tonumber(lastSegmentTimestamp)\n\
                local segmentNumber = tonumber(lastSegmentNumber)\n\
                local currentTimestamp = tonumber(ARGV[2])\n\
                local currentSegmentSize = 0\n\
                local isNewSegment = false\n\
                \n\
                if lastSegmentNumber ~= nil then\n\
                    currentSegmentSize = tonumber(redis.call('zcount', 'channel_' .. KEYS[1] .. '_segment_' .. segmentNumber, '-inf', '+inf'))\n\
                end\n\
                \n\
                if lastSegmentNumber == nil or (lastSegmentNumber ~= nil and (currentTimestamp > segmentTimestamp+" + this.options.maxSegmentTime + " or currentSegmentSize >= " + this.options.maxSegmentElements + ")) then\n\
                    segmentNumber = redis.call('incr', 'channel_' .. KEYS[1] .. '_counter')\n\
                    segmentTimestamp = currentTimestamp\n\
                    redis.call('zadd', 'channel_' .. KEYS[1] .. '_segments', currentTimestamp, segmentNumber)\n\
                    isNewSegment = true\n\
                end\n\
                redis.call('zadd', 'channel_' .. KEYS[1] .. '_segment_' .. segmentNumber, currentTimestamp, ARGV[1])\n\
                \n\
                if isNewSegment then\n\
                    redis.call('expire', 'channel_' .. KEYS[1] .. '_segment_' .. segmentNumber, " + this.options.maxSegmentLifetime + ")\n\
                end\n\
            "
        },
        _luaScriptsHashes = {};
        
    
    /* ---------------------------------------------------------------------- */

    this.configure = function(_next)
    {
        _next = _next || function() {};
        var self = this;
        
        this.executeEvent('configure', function(_eventNext) {
            var port = self.options.port || 6379,
                host = self.options.host || '127.0.0.1';

            async.parallel([
                function(_eventPartNext) {
                    self.loadResourceConfig(_eventPartNext);
                },
                function(_eventPartNext) {
                    _clientPublisher = redis.createClient(port, host, options);
                    _clientPublisher.on("error", function(err) {
                        logger.error('Redis publisher: ' + err, self);
                        process.exit();
                    });
                    _clientPublisher.on("connect", function() {
                        var funcs = [];
                        _.each(_.keys(_luaScripts), function(name) {
                            funcs.push(function(_luaNext) {
                                _clientPublisher.script('load', _luaScripts[name], function(err, data) {
                                    if(err) {
                                        logger.error(err);
                                    } else {
                                        _luaScriptsHashes[name] = data; 
                                    }
                                    _luaNext();
                                });
                            });
                        });
                        
                        async.parallel(funcs, _eventPartNext);
                    });
                },
                function(_eventPartNext) {
                    _clientSubscriber = redis.createClient(port, host, options);
                    _clientSubscriber.on("error", function(err) {
                        logger.error('Redis subscriber: ' + err, self);
                        process.exit();
                    });
                    _clientSubscriber.on("connect", function() {
                        _clientSubscriber.on("message", function(channel, timestamp) {
                            if(_.isUndefined(_subscribers[channel])) {
                                logger.warn('Channel "' + channel + '" does not exists', self);
                            } else {
                                var funcs = [];
                                _.each(_.keys(_subscribers[channel]), function(subscriberName) {
                                    funcs.push(function(_funcNext) {
                                        self.syncSubscriber(channel, subscriberName, timestamp, function(err) {
                                            if(err) {
                                                logger.warn(err, self);
                                            }
                                            _funcNext();
                                        });
                                    });
                                });
                                async.parallel(funcs);
                            }
                        });
                        _eventPartNext();
                    });                    
                }
            ], _eventNext);
        }, _next);
    };

    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            this.removeAllSubscribers(null, function() {
                _clientSubscriber.end();
                _clientPublisher.end();
                _eventNext(); 
            });
        }.bind(this), _next);
    };

    /* ---------------------------------------------------------------------- */
    
    this.getSubscriberClient = function() { return _clientSubscriber; }
    this.getPublisherClient = function() { return _clientPublisher; }
    
    this.addSubscriber = function(channel, subscriberName, sync, subscriberFunc, callback)
    {
        sync = !!sync;
        
        if(!_.isObject(_subscribers[channel])) {
            _subscribers[channel] = {};
        } else if(this.options.maxSubscribers > 0 && _.keys(_subscribers[channel]).length >= this.options.maxSubscribers) {
            callback('Maximum number of subscribers per channel cannot be higher than ' + this.options.maxSubscribers, false);
            return;
        }
        
        if(!_.isUndefined(_subscribers[channel][subscriberName])) {
            callback('Subscriber "' + subscriberName + '" has already exists on channel "' + channel + '"', false);
            return;
        }
        
        if(!this.resourceConfig[subscriberName]) {
            this.resourceConfig[subscriberName] = {
                'syncs': {},
                'maxTimestamp': 0
            };
        }
        
        var subscriberContainer = { 
            name: subscriberName, 
            func: subscriberFunc, 
            config: this.resourceConfig[subscriberName]
        };
        _subscribers[channel][subscriberName] = subscriberContainer;

        if(!sync) {
            logger.debug('Subscribe channel "' + channel + '"', this);
            _clientSubscriber.subscribe(channel);
            
            callback(null, true);
            return;
        }
        
        if(_.keys(this.resourceConfig[subscriberName].syncs) > 0) {
            var segmentKeys = _.keys(this.resourceConfig[subscriberName].syncs);
            if(segmentKeys.length > 0) {
                var funcs = [];
                _.each(segmentKeys, function(segmentKey) {
                    funcs.push(function(_segmentNext) {
                        _syncSegments(channel, subscriberName, segmentKey, this.resourceConfig, _segmentNext);
                    }.bind(this));
                }.bind(this));
                
                async.parallel(funcs, function(err) {
                    if(err) {
                        callback(err, null);
                    } else {
                        this.syncSubscriber(channel, subscriberName, null, function() {
                            logger.debug('Subscribe channel "' + channel + '"', this);
                            _clientSubscriber.subscribe(channel);
                            callback();
                        });
                    }
                }.bind(this));
                
                return;
            }
        } else {
            this.syncSubscriber(channel, subscriberName, null, function() {
                logger.debug('Subscribe channel "' + channel + '"', this);
                _clientSubscriber.subscribe(channel);
                callback();
            });
        }
    };
    
    this.syncSubscriber = function(channel, subscriberName, newMaxTimestamp, callback)
    {
        var currentTimestamp = new Date().getTime();
        
        if(!newMaxTimestamp) {
            newMaxTimestamp = currentTimestamp;
        }
        var oldMaxTimestamp = this.resourceConfig[subscriberName].maxTimestamp;
        
        if(newMaxTimestamp < oldMaxTimestamp) {
            callback(null, false);
            return;
        }
        
        var maxNotExpiredTimestamp = currentTimestamp - this.options.maxSegmentLifetime * 1000;
        if(maxNotExpiredTimestamp > oldMaxTimestamp) {
            logger.debug('Not expired timestamp "' + maxNotExpiredTimestamp + '" is higher than old max timestamp "' + oldMaxTimestamp + '"', this);
            oldMaxTimestamp = maxNotExpiredTimestamp;
        }
        
        this.resourceConfig[subscriberName].maxTimestamp = Math.max(this.resourceConfig[subscriberName].maxTimestamp, newMaxTimestamp);
        _syncSubscriberRange(channel, subscriberName, oldMaxTimestamp, newMaxTimestamp, this.resourceConfig, callback);
    };
    
    this.removeSubscriber = function(channel, subscriberFunc, callback)
    {
        if(_.isUndefined(_subscribers[channel])) {
            callback('Channel "' + channel + '" does not exists', false);
            return;
        }
        
        logger.debug('Remove subscriber by function from channel "' + channel + '"', this);
        
        _.each(_.keys(_subscribers[channel]), function(subscriberName) {
            if(_subscribers[channel][subscriberName].func === subscriberFunc) {
                logger.debug('Save config subscribers', this);
                this.saveResourceConfig(function(err) {
                    delete _subscribers[channel][subscriberName];
                    if(_subscribers[channel].length === 0) {
                        logger.debug('Unsubscriber channel "' + channel + '"', this);
                        _clientSubscriber.unsubscribe(channel);
                    }
                    callback(err, true);
                }.bind(this));
                
                return true;
            }
        }.bind(this));
        
        callback('Subscriber does not exists in channel "' + channel + '"', false);
    };
    
    this.removeSubscriberByName = function(channel, subscriberName, callback)
    {
        if(_.isUndefined(_subscribers[channel])) {
            callback('Channel "' + channel + '" does not exists', false);
            return;
        }
        
        logger.debug('Remove subscriber by name "' + subscriberName + '" from channel "' + channel + '"', this);
        if(_.isUndefined(_subscribers[channel][subscriberName])) {
            callback('Subscriber "' + subscriberName + '" does not exists in channel "' + channel + '"', false);
            return;
        }
        
        this.saveResourceConfig(function(err) {
            delete _subscribers[channel][subscriberName];
            callback(err, true);
        }.bind(this));
    };
    
    this.removeAllSubscribers = function(channels, callback)
    {
        if(_.isString(channels)) {
            channels = [channels];
        } else if(_.isUndefined(channels)) {
            channels = _.keys(_subscribers);
        }
        
        logger.debug('Save config subscribers', this);
        this.saveResourceConfig(function(err) {
            if(err) {
                logger.warn(err, this);
            }
            
            _.each(channels, function(channel) {
                logger.debug('Remove all subscribers from channel "' + channel + '"', this);
                if(!_.isUndefined(_subscribers[channel])) {
                    delete _subscribers[channel];
                    logger.debug('Unsubscriber channel "' + channel + '"', this);
                    _clientSubscriber.unsubscribe(channel);
                } else {
                    logger.warn('Channel "' + channel + '" does not exists', this);
                }
                logger.debug('Unsubscriber channel "' + channel + '"', this);
                _clientSubscriber.unsubscribe(channel);
            }.bind(this));
            
            callback();
        }.bind(this));
    };
    
    this.setMaxSubscribers = function(n)
    {
        if(!_.isFinite(n) && (n|0) === n) {
            throw new Error('Invalid data format (expected: integer)');
        }
        
        if(n < 0) {
            throw new Error('Number must be higher or equals 0');
        }
        
        logger.debug('Set maximum subscribers (' + n + ')', this);
        this.options.maxSubscribers = n;
    };
    
    this.subscribers = function(channel)
    {
        if(_.isUndefined(_subscribers[channel])) {
            return [];
        }
        return _subscribers[channel];
    };
    
    this.appendData = function(channel, data, timestamp, publish, callback)
    {
        logger.debug('Append data to channel "' + channel + '"', this);
        if(!timestamp) {
            timestamp = new Date().getTime();
        }
        publish = !!publish;
        callback = callback ? callback : function() {}
        
        _clientPublisher.evalsha(_luaScriptsHashes.appendData, 1, channel, JSON.stringify(data), timestamp, function(err) {
            if(err) {
                logger.error(err, this);
                callback(false);
            } else {
                if(publish) {
                    this.publish(channel, timestamp);
                }
                callback(timestamp);
            }
        }.bind(this));
    };
    
    this.publish = function(channel, timestamp)
    {
        logger.debug('Publish on channel "' + channel + '"', this);
        _clientPublisher.publish(channel, timestamp);
    };
    
    /* ---------------------------------------------------------------------- */
    
    var _syncSubscriberRange = function(channel, subscriberName, oldMaxTimestamp, newMaxTimestamp, resourceConfig, callback)
    {
        _getSegments(channel, oldMaxTimestamp, newMaxTimestamp, function(err, segments) {
            if(err) {
                callback(err, null);
            } else {
                var syncConfig = {
                    beginTimestamp: oldMaxTimestamp,
                    endTimestamp: newMaxTimestamp,
                    segments: segments
                };
                resourceConfig[subscriberName].syncs[oldMaxTimestamp + '_' + newMaxTimestamp] = syncConfig;
                _syncSegments(channel, subscriberName, oldMaxTimestamp + '_' + newMaxTimestamp, resourceConfig, callback);
            }
        }.bind(this));
    }
    
    var _getSegments = function(channel, oldMaxTimestamp, newMaxTimestamp, callback)
    {
        logger.debug('Get younger segments than "' + oldMaxTimestamp + '" and older than "' + newMaxTimestamp + '"', BufRemoteEventResource.prototype);

        _clientPublisher.zrangebyscore(
            'channel_' + channel + '_segments', 
            oldMaxTimestamp, 
            newMaxTimestamp, 
            'WITHSCORES',
            function(err, youngerSegments) {
                // youngerSegments -> [ number1, timestamp1, numer2, timestamp2, ... ]
                if(err) {
                    callback(err, false);
                    return;
                }
                
                var segments = {},
                    maxNumber = 0,
                    currentNumber = 0;
            
                for(var i = 0; i < youngerSegments.length; i++) {
                    currentNumber = youngerSegments[i];
                    segments[currentNumber] = youngerSegments[++i];
                    if(maxNumber < currentNumber) {
                        maxNumber = currentNumber;
                    }
                }

                if(youngerSegments.length === 0 || segments[maxNumber] > oldMaxTimestamp) {
                    logger.debug('Get single segment older than "' + oldMaxTimestamp + '"', BufRemoteEventResource.prototype);
                    
                    _clientPublisher.zrevrangebyscore(
                        'channel_' + channel + '_segments',
                        oldMaxTimestamp,
                        '-inf',
                        'WITHSCORES',
                        'LIMIT', '0', '1',
                        function(err, olderSegment) {
                            if(err) {
                                callback(err, false);
                                return;
                            }
                            
                            if(olderSegment.length > 0) {
                                segments[olderSegment[0]] = olderSegment[1];
                            } 
                            
                            callback(null, segments);
                        }
                    );
                } else {
                    callback(null, segments);
                }
            }.bind(this)
        );
    };
    
    var _syncSegments = function(channel, subscriberName, syncKey, resourceConfig, callback)
    {     
        var syncConfig = resourceConfig[subscriberName].syncs[syncKey];
        var segmentNumbers = _.keys(syncConfig.segments);
        
        logger.debug('Sync subscriber "' + subscriberName + '" ( ' + syncConfig.beginTimestamp + '-' + syncConfig.endTimestamp + ' ] (segments: ' + JSON.stringify(segmentNumbers) + ')', BufRemoteEventResource.prototype);
        
        var funcs = [];
        _.each(segmentNumbers, function(segmentNumber) {
            funcs.push(function(_segmentNext) {
                _clientPublisher.zrangebyscore(
                    'channel_' + channel + '_segment_' + segmentNumber, 
                    '(' + syncConfig.beginTimestamp, 
                    syncConfig.endTimestamp, 
                    function(err, rawResults) {
                        if(err) {
                            _segmentNext(err);
                            return;
                        }

                        logger.debug('Sync subscriber "' + subscriberName + '" segment "' + segmentNumber + '" (rows: ' + rawResults.length + ')', BufRemoteEventResource.prototype);

                        var result = [];
                        _.each(rawResults, function(rawResult) {
                            result.push(JSON.parse(rawResult));
                        });           
                        if(result.length > 0 && _subscribers[channel][subscriberName]) {
                            _subscribers[channel][subscriberName].func(result, function(err) {
                                if(err) {
                                    err = "[ " + subscriberName + " seg: " + segmentNumber + " ] " + err;
                                }
                                delete syncConfig.segments[segmentNumber];
                                _segmentNext(err);
                            });
                        } else {
                            delete syncConfig.segments[segmentNumber];
                            _segmentNext();
                        }
                    }
                );
            });
        });

        async.parallel(funcs, function(err) {
            if(err) {
                callback(err, false);
            } else {
                if(_subscribers[channel][subscriberName]) {
                    delete resourceConfig[subscriberName].syncs[syncKey];
                }
                callback(null, true);
            }
        });
    }
}

util.inherits(BufRemoteEventResource, AbstractResource);
BufRemoteEventResource.prototype.className = 'resources.BufRemoteEvent';
BufRemoteEventResource.prototype.dependencies = [];

module.exports = BufRemoteEventResource;