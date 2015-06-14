var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    SocketIOWorker = require(CORE_PATH + '/plugin/spider/worker/SocketIOWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    TimeDate = require('time').Date;
    util = require('util');

var BtcchinaPlugin = function(options) 
{
    BtcchinaPlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

    /* ---------------------------------------------------------------------- */

    var _spiderUri = 'https://websocket.btcchina.com';
    var _spiderPairs = {
        "CNY": [ "BTC", "LTC" ],
        "BTC": [ "LTC" ]
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
            'libraryVersion': '1.0',
            'eventName': 'trade',
            'collect': function(result) {
                var fCurrency = result.market.substr(0, 3),
                    sCurrency = result.market.substr(3, 3);

                bufRemoteEvent.appendData(
                    'exchange_trade', { 
                        object: self.className, 
                        data: {
                            fCurrency: fCurrency,
                            sCurrency: sCurrency,
                            date: result.date*1000,
                            price: result.price,
                            amount: result.amount,
                            isAsk: result.type == 'sell',
                            tid: result.trade_id
                        }
                    }, 
                    null, 
                    false, 
                    function(timestamp) {
                        if(!timestamp) {
                            logger.warn('Error while append data', self);
                        } else {
                            bufRemoteEvent.publish('exchange_trade', new Date().getTime());
                        }
                    }
                );
            }
        });
        worker.options.syncEvents.postStart.push(function(callback) {
            var fCurrencies = _.keys(_spiderPairs),
                conn = worker.getWebsocket(),
                pairs = [];

            _.each(fCurrencies, function(fCurrency) {
                _.each(_spiderPairs[fCurrency], function(sCurrency) {
                    pairs.push('marketdata_' + fCurrency.toLowerCase() + sCurrency.toLowerCase());
                });
            });

            conn.emit('subscribe', pairs);
            callback();
        });

        worker.options.syncEvents.preStop.push(function(callback) {
            var fCurrencies = _.keys(_spiderPairs),
                conn = worker.getWebsocket(),
                pairs = [];

            _.each(fCurrencies, function(fCurrency) {
                _.each(_spiderPairs[fCurrency], function(sCurrency) {
                    pairs.push('marketdata_' + fCurrency.toLowerCase() + sCurrency.toLowerCase());
                });
            });
            
            conn.emit('unsubscribe', pairs);
            callback();
        });

        this.bindChild('btcchina_trade', worker);
    };

    this.getExchangeName = function()
    {
        return 'BTCCHINA';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "CNY": [ "BTC", "LTC" ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC": [ "CNY", "LTC" ],
            "LTC": [ "CNY", "BTC" ]
        };
    };
}

util.inherits(BtcchinaPlugin, AbstractPlugin);
BtcchinaPlugin.prototype.className = 'plugins.Btcchina';
BtcchinaPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = BtcchinaPlugin;