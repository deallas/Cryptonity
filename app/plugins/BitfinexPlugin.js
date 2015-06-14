var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    JsonWorker = require(CORE_PATH + '/plugin/spider/worker/JsonWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    util = require('util');

var BitfinexPlugin = function(options) 
{
    BitfinexPlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

    this.options = _.extend({ 'limitTrades': 100, 'cronTime': '*/3 * * * * *' }, this.options);

    /* ---------------------------------------------------------------------- */

    var _spiderPairs = {
        "BTC": [ "USD" ],
        "LTC": [ "USD" ],
        "DKK": [ "BTC", "USD" ]
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
        var self = this;
        var fCurrencies = _.keys(_spiderPairs);
        var bufRemoteEvent = this.getDependency('resources.BufRemoteEvent');

        _.each(fCurrencies, function(fCurrency) {
            _.each(_spiderPairs[fCurrency], function(sCurrency) {
                if(_.isUndefined(this.resourceConfig['max_' + fCurrency + '_' + sCurrency])) {
                    self.resourceConfig['max_' + fCurrency + '_' + sCurrency] = 0;
                }
                
                this.bindChild('bitfinex_trade_' + fCurrency + '_' + sCurrency, new JsonWorker({
                    'cronTime' : self.options.cronTime,
                    'requestParams' : {
                        host: 'api.bitfinex.com',
                        port: 443,
                        path: '/v1/trades/' + _fixCurrencyName(fCurrency.toLowerCase()) + _fixCurrencyName(sCurrency.toLowerCase()) + '?limit_trades=' + self.options.limitTrades,
                        method: 'GET',
                        rejectUnauthorized: false,
                        headers: { 'accept-encoding': 'gzip,deflate' }
                    },
                    'collect': function(trades) {
                        var funcs = [],
                            localMaxTid = self.resourceConfig['max_' + fCurrency + '_' + sCurrency];

                        _.each(trades, function(trade) {
                            if(trade.tid > self.resourceConfig['max_' + fCurrency + '_' + sCurrency]) {                                 
                                funcs.push(function(_dataNext) {
                                    trade.fCurrency = fCurrency;
                                    trade.sCurrency = sCurrency;
                                    trade.date = new Date(trade.timestamp*1000);
                                    trade.isAsk = trade.type === 'sell';
                                    
                                    delete trade.type;
                                    delete trade.exchange;
                                    delete trade.item;

                                    bufRemoteEvent.appendData('exchange_trade', { object: self.className, data: trade }, null, false, function(timestamp) {
                                        if(!timestamp) {
                                            _dataNext('Error while append data');
                                        } else {
                                            _dataNext();
                                        }
                                    });
                                });

                                if(trade.tid > localMaxTid) {
                                    localMaxTid = trade.tid;
                                }
                            }
                        });

                        self.resourceConfig['max_' + fCurrency + '_' + sCurrency] = Math.max(self.resourceConfig['max_' + fCurrency + '_' + sCurrency], localMaxTid);

                        async.parallel(funcs, function(err) {
                            if(err) {
                                logger.warn(err, self);
                            } else if(funcs.length > 0) {
                                bufRemoteEvent.publish('exchange_trade', new Date().getTime());
                            }
                        });
                    }
                }));
            }.bind(this));
        }.bind(this));
    };

    this.getExchangeName = function()
    {
        return 'BITFINEX';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "USD": [ "BTC", "LTC", "DKK" ],
            "DKK": [ "BTC", "USD" ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC" : [ "USD", "DKK" ],
            "LTC" : [ "USD" ]
        };
    };
    
    /* ---------------------------------------------------------------------- */
    
    var _fixCurrencyName = function(currency)
    {
        if(currency === 'dkk') {
            currency = 'drk';
        }

        return currency;
    }
}

util.inherits(BitfinexPlugin, AbstractPlugin);
BitfinexPlugin.prototype.className = 'plugins.Bitfinex';
BitfinexPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = BitfinexPlugin;