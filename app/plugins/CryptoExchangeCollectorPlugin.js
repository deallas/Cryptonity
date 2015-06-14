var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js'),
    util = require('util');

var CryptoExchangeCollectorPlugin = function(options) 
{
    CryptoExchangeCollectorPlugin.super_.call(this, options);
    
    this.options = _.extend({ 'bulkInsert': 100 }, this.options);
    
    /* ---------------------------------------------------------------------- */

    var _objectsCache = {};
    
    /* ---------------------------------------------------------------------- */

    this.configure = function(_next)
    {        
        var self = this;
        
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            var bufRemoteEvent = this.getDependency('resources.BufRemoteEvent'),
                marketService = APP.getService('market'),
                currencyService = APP.getService('currency'),
                statsService = APP.getService('stats'),
                depthService = APP.getService('depth');
            
            var funcs = {
                'markets': function(_marketNext) { 
                    marketService.getMarkets(function() {
                        _marketNext();
                    }); 
                },
                'currencies': function(_currencyNext) {
                    currencyService.getCurrencies(function() {
                        _currencyNext();
                    });
                },
                'marketsCurrencies': [ 'markets', 'currencies', function(_mcNext) { 
                    marketService.getMarketsCurrencies(function(err) {
                        if(err) {
                            logger.error(err, self);
                        }
                        _mcNext();
                    });
                }]
            };
            
            async.auto(funcs, function(err) { // fill all and cache
                if(err) {
                    logger.error(err, self);
                    process.exit();
                }
                async.parallel(
                    [ 
                        _collectTrades(bufRemoteEvent, marketService, self.options), 
                        _collectStats(bufRemoteEvent, statsService, self.options),
                        _collectDepth(bufRemoteEvent, depthService, self.options)
                    ], 
                    _eventNext
                ); 
            });
        }.bind(this), _next);
    };
    
    /* ---------------------------------------------------------------------- */
    
    var _collectDepth = function(bufRemoteEvent, depthService, options) 
    {
        return function(_collectNext) {
            _collectNext(); // TODO
        };
    };
    
    var _collectStats = function(bufRemoteEvent, statsService, options) 
    {
        return function(_collectNext) {
            _collectNext(); // TODO
        };
    };
    
    var _collectTrades = function(bufRemoteEvent, marketService, options) 
    {
        return function(_collectNext) {
            bufRemoteEvent.addSubscriber('exchange_trade', 'exchange_trade', true, function(rows, _dataNext) {
                var rFuncs = [],
                    dFuncs = [],
                    multiInsertData = [];

                _.each(rows, function(row) {
                    if(_.isUndefined(row.object)) {
                        logger.warn('Object name has been not defined', CryptoExchangeCollectorPlugin.prototype);
                        return;
                    }
                    if(_.isUndefined(row.data)) {
                        logger.warn('Data has been not defined', CryptoExchangeCollectorPlugin.prototype);
                        return;
                    }

                    var data = row.data;

                    if(!_objectsCache[row.object]) {
                        var obj = APP.getObject(row.object);
                        if(!extUtil.isImplemented(obj, CryptoExchangeContext)) {
                            logger.warn('Object "' + row.object + '" does not implement "CryptoExchangeContext"', CryptoExchangeCollectorPlugin.prototype);
                            return;
                        }
                        _objectsCache[row.object] = obj;
                    }

                    rFuncs.push(function(_rNext) {
                        _objectsCache[row.object].getExchangeCurrencyPair(data.fCurrency, data.sCurrency, function(marketsCurrency) {
                            if(_.isObject(marketsCurrency)) {
                                multiInsertData.push({
                                    'createdAt': data.date,
                                    'price': data.price,
                                    'amount': data.amount,
                                    'tid': data.tid,
                                    'isAsk': data.isAsk,
                                    'marketsCurrencyId': marketsCurrency.id
                                });

                                if(multiInsertData.length == options.bulkInsert) {
                                    var trades = _.map(multiInsertData, _.clone);
                                    dFuncs.push(function(_dNext) {
                                        marketService.collectTrades(trades, function() {
                                            _dNext();
                                        });
                                    });
                                    multiInsertData = [];
                                }
                            }
                            _rNext();
                        });
                    });
                });

                async.series(rFuncs, function() {
                    if(multiInsertData.length > 0) {
                        dFuncs.push(function(_dNext) {
                            marketService.collectTrades(multiInsertData, function() {
                                _dNext();
                            });
                        });
                    }

                    async.parallel(dFuncs, _dataNext);
                });
            }, function(err) {
                if(err) {
                    logger.warn(err, CryptoExchangeCollectorPlugin.prototype);
                }
                _collectNext();
            });
        };
    }
}

util.inherits(CryptoExchangeCollectorPlugin, AbstractPlugin);
CryptoExchangeCollectorPlugin.prototype.className = 'plugins.CryptoExchangeCollector';
CryptoExchangeCollectorPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent', 'resources.Database' ];   

module.exports = CryptoExchangeCollectorPlugin;