var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    WebsocketWorker = require(CORE_PATH + '/plugin/spider/worker/WebsocketWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    TimeDate = require('time').Date;
    util = require('util');

var OkcoinPlugin = function(options) 
{
    OkcoinPlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

    /* ---------------------------------------------------------------------- */

    var _spiders = {
        "international": {
            "uri": 'wss://real.okcoin.com:10440/websocket/okcoinapi',
            "pairs": {
                "BTC": [ "USD" ],
                "LTC": [ "USD" ]
            }
        },
        "china": {
            "uri": 'wss://real.okcoin.cn:10440/websocket/okcoinapi',
            "pairs": {
                "BTC": [ "CNY" ],
                "LTC": [ "CNY" ]
            }
        }
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
        
        _.each(_.keys(_spiders), function(spiderName) {
            var worker = new WebsocketWorker({
                'uri': _spiders[spiderName].uri,
                'opts': {reconnection: true},
                'collect': function(result) {
                    try {
                        result = JSON.parse(result);
                        result = result[0];
                    } catch(exc) {
                        logger.warn(exc, self);
                        return;
                    }
                    var fCurrency = result.channel.substr(3, 3),
                        sCurrency = result.channel.substr(6, 3);
                    
                    var funcs = [];
                    _.each(result.data, function(row) {                              
                        funcs.push(function(_dataNext) {
                            var aDate = new TimeDate();
                            aDate.setTimezone('Asia/Shanghai');
                            
                            var time = row[2].split(':');
                            var tDate = new TimeDate(aDate.getFullYear(), aDate.getMonth(), aDate.getDate(), time[0], time[1], time[2], 'Asia/Shanghai');
                            tDate.setTimezone('Asia/Shanghai');
                            
                            bufRemoteEvent.appendData(
                                'exchange_trade', { 
                                    object: self.className, 
                                    data: {
                                        fCurrency: fCurrency,
                                        sCurrency: sCurrency,
                                        date: tDate.getTime(),
                                        price: row[0],
                                        amount: row[1],
                                        isAsk: row[3] === 'ask',
                                        tid: null // NOT SUPPORTED :(
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
                var fCurrencies = _.keys(_spiders[spiderName].pairs),
                    conn = worker.getWebsocketConnection();

                _.each(fCurrencies, function(fCurrency) {
                    _.each(_spiders[spiderName].pairs[fCurrency], function(sCurrency) {
                        conn.send(JSON.stringify({
                            'event': 'addChannel',
                            'channel': 'ok_' + fCurrency.toLowerCase() + sCurrency.toLowerCase() + '_trades'
                        }));
                    });
                });
                callback();
            });

            worker.options.syncEvents.preStop.push(function(callback) {
                var fCurrencies = _.keys(_spiders[spiderName].pairs),
                    conn = worker.getWebsocketConnection();

                _.each(fCurrencies, function(fCurrency) {
                    _.each(_spiders[spiderName].pairs[fCurrency], function(sCurrency) {
                        conn.send(JSON.stringify({
                            'event': 'removeChannel',
                            'channel': 'ok_' + fCurrency.toLowerCase() + sCurrency.toLowerCase() + '_trades'
                        }));
                    });
                });
                callback();
            });

            this.bindChild('okcoin_trade_' + spiderName, worker);
        }.bind(this));
    };

    this.getExchangeName = function()
    {
        return 'OKCOIN';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "USD": [ "BTC", "LTC" ],
            "CNY": [ "BTC", "LTC" ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC": [ "USD", "CNY" ],
            "LTC": [ "USD", "CNY" ]
        };
    };
}

util.inherits(OkcoinPlugin, AbstractPlugin);
OkcoinPlugin.prototype.className = 'plugins.Okcoin';
OkcoinPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = OkcoinPlugin;