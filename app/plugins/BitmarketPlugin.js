var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    JsonWorker = require(CORE_PATH + '/plugin/spider/worker/JsonWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    util = require('util');

var BitmarketPlugin = function(options) 
{
    BitmarketPlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

    this.options = _.extend({ 'cronTime': '*/15 * * * * *' }, this.options);

    /* ---------------------------------------------------------------------- */

    var _spiderPairs = {
        "BTC": [ "PLN" ],
        "LTC": [ "PLN" ]
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
                
                this.bindChild('bitmarket_trade_' + fCurrency + '_' + sCurrency, new JsonWorker({
                    'cronTime' : self.options.cronTime,
                    'requestParams' : {
                        host: 'www.bitmarket.pl',
                        port: 443,
                        path: '/json/' + fCurrency.toUpperCase() + sCurrency.toUpperCase() + '/trades.json',
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
                                    trade.date = new Date(trade.date*1000);
                                    trade.isAsk = null; // not supported :(
                                    
                                    delete trade.type;

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
        return 'BITMARKET';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "PLN": [ "BTC", "LTC" ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC" : [ "PLN" ],
            "LTC" : [ "PLN" ]
        };
    };
}

util.inherits(BitmarketPlugin, AbstractPlugin);
BitmarketPlugin.prototype.className = 'plugins.Bitmarket';
BitmarketPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = BitmarketPlugin;