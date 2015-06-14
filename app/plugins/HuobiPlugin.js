var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    SocketIOWorker = require(CORE_PATH + '/plugin/spider/worker/SocketIOWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    TimeDate = require('time').Date;
    util = require('util');

var HuobiPlugin = function(options) 
{
    HuobiPlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

    /* ---------------------------------------------------------------------- */

    var _spiderUri = 'hq.huobi.com:80';
    var _spiderPairs = {
        "BTC": [ "CNY" ]
    };
    
    this.configure = function(_next)
    {        
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) { 
            this.loadResourceConfig(function() {
                if(this.options.autoStartSpider) {
                    this.startSpider();
                }
                
                _eventNext();
            }.bind(this));
        }.bind(this), _next);
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.startSpider = function()
    {
        var bufRemoteEvent = this.getDependency('resources.BufRemoteEvent');
        var self = this;
        
        var worker = new SocketIOWorker({
            'uri': _spiderUri,
            'collect': function(result) {
                var fCurrency = result.symbolId.substr(0, 3),
                    sCurrency = result.symbolId.substr(3, 3),
                    funcs = [];
            
                _.each(result.payload.tradeId, function(tradeId, index) {
                    funcs.push(function(_dataNext) {
                        bufRemoteEvent.appendData(
                            'exchange_trade', { 
                                object: self.className, 
                                data: {
                                    fCurrency: fCurrency,
                                    sCurrency: sCurrency,
                                    date: result.payload.time[index]*1000,
                                    price: result.payload.price[index],
                                    amount: result.payload.amount[index],
                                    isAsk: result.payload.direction[index] == 2,
                                    tid: tradeId
                                }
                            }, 
                            null, 
                            false, 
                            function(timestamp) {
                                if(!timestamp) {
                                    _dataNext('Error while append data');
                                } else {
                                    _dataNext();
                                }
                            }
                        );
                    });
                });
                
                async.parallel(funcs, function(err) {
                    if(err) {
                        logger.warn(err, self);
                    } else if(funcs.length > 0) {
                        bufRemoteEvent.publish('exchange_trade', new Date().getTime());
                    }
                });
            }
        });
        worker.options.syncEvents.postStart.push(function(callback) {
            var fCurrencies = _.keys(_spiderPairs),
                conn = worker.getWebsocket(),
                marketDetails = [];

            _.each(fCurrencies, function(fCurrency) {
                _.each(_spiderPairs[fCurrency], function(sCurrency) {
                    marketDetails.push({
                        "symbolId": fCurrency.toLowerCase() + sCurrency.toLowerCase(),
                        "pushType": "pushLong"
                    });
                });
            });
            
            conn.emit('request', {
                "symbolList": {
                    "tradeDetail": marketDetails
                },
                "version": 1,
                "msgType": "reqMsgSubscribe",
                "retCode": 200,
                "retMsg": "Success"
            });

            callback();
        });

        worker.options.syncEvents.preStop.push(function(callback) {
            var fCurrencies = _.keys(_spiderPairs),
                conn = worker.getWebsocket(),
                marketDetails = [];

            _.each(fCurrencies, function(fCurrency) {
                _.each(_spiderPairs[fCurrency], function(sCurrency) {
                    marketDetails.push({
                        "symbolId": fCurrency.toLowerCase() + sCurrency.toLowerCase(),
                        "pushType": "pushLong"
                    });
                });
            });
            
            conn.emit('request', {
                "symbolList": {
                    "tradeDetail": marketDetails
                },
                "version": 1,
                "msgType": "reqMsgUnsubscribe",
                "retCode": 200,
                "retMsg": "Success"
            });
            
            callback();
        });

        this.bindChild('huobi_trade', worker);
    };

    this.getExchangeName = function()
    {
        return 'HUOBI';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "CNY": [ "BTC" ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC": [ "CNY" ]
        };
    };
}

util.inherits(HuobiPlugin, AbstractPlugin);
HuobiPlugin.prototype.className = 'plugins.Huobi';
HuobiPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = HuobiPlugin;