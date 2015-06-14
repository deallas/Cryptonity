var AbstractService = require(APP_PATH + '/core/AbstractService.js'),
    logger = require(APP_PATH + '/core/Logger.js'),
    async = require('async');

var MarketService = function(options) {
    MarketService.super_.call(this, options);

    /* ---------------------------------------------------------------------- */
    
    var db = APP.getResource('database'),
        currencyService = APP.getService('currency'),
        marketFeeModel = db.getModel('marketFee'),
        marketModel = db.getModel('market'),
        marketsCurrencyModel = db.getModel('marketsCurrency'),
        marketTradeModel = db.getModel('marketTrade');
    
    /* ---------------------------------------------------------------------- */
    
    this.getLastFee = function(marketsCurrency, callback)
    {
        logger.debug('Get last fee [ ' + marketsCurrency.id + ' ]', this);
        marketFeeModel.find({
            where: { 
                marketsCurrencyId: marketsCurrency.id
            }, 
            order: 'dateAdded DESC' 
        }).success(callback);
    };

    this.getMarketById = function(id, callback)
    {
        logger.debug('Get market by id [ ' + id + ' ]', this);
        if(!_.isObject(this._cache.markets) || !_.isObject(this._cache.markets[id])) {
            var self = this;
            marketModel.find({ 
                where: { 
                    marketId : id
                }
            }).success(function(result) {
                if(_.isUndefined(result)) {
                    callback('Market id "' + id + '" does not exists');
                } else {
                    if(!_.isObject(self._cache.markets)) {
                        self._cache.nameMarkets = {};
                        self._cache.markets = {};
                    }
                    
                    self._cache.markets[id] = result; 
                    self._cache.nameMarkets[result.name] = result;
                    callback(false, result);
                }
            });
        } else {
            callback(null, this._cache.markets[id]);
        }
    };

    this.getMarketByName = function(marketName, callback)
    {
        logger.debug('Get market by name [ ' + marketName + ' ]', this);
        marketName = marketName.toUpperCase();
        
        if(!_.isObject(this._cache.nameMarkets) || !_.isObject(this._cache.nameMarkets[marketName])) {
            var self = this;
            marketModel.find({ 
                where: { 
                    name : marketName 
                }
            }).success(function(result) {
                if(_.isUndefined(result)) {
                    callback('Market "' + marketName + '" does not exists');
                } else {
                    if(!_.isObject(self._cache.nameMarkets)) {
                        self._cache.nameMarkets = {};
                        self._cache.markets = {};
                    }
                    
                    self._cache.markets[result.marketId] = result; 
                    self._cache.nameMarkets[marketName] = result;
                    callback(false, result);
                }
            });
        } else {
            callback(false, this._cache.nameMarkets[marketName]);
        }
    };

    this.getMarkets = function(callback)
    {
        logger.debug('Get markets', this);
        
        if(!_.isObject(this._cache.nameMarkets)) {
            this._cache.nameMarkets = {};
            this._cache.markets = {};
            var self = this;
            marketModel.findAll().success(function(rows) {
                _.each(rows, function(row) {
                    self._cache.markets[row.marketId] = row;
                    self._cache.nameMarkets[row.name] = row;
                });
                callback(self._cache.nameMarkets);
            });
        } else {
            callback(this._cache.nameMarkets);
        }
    };

    this.cleanMarketsCache = function()
    {
        this._cache.markets = null;
        this._cache.nameMarkets = null;
    };

    this.getMarketCryptoCurrencies = function(marketName, callback)
    {
        logger.debug('Get marketCryptoCurrencies [ ' + marketName + ' ]', this);

        this.getMarketByName(marketName, function(err, market) {
            if(err) {
                callback(err);
                return;
            }

            marketsCurrencyModel.findAll({ 
                where: { 
                    marketId: market.marketId 
                } 
            }).success(function(results) {
                var funcs = {},
                    currencies = [];

                results.each(function(result) {
                    if(!_.isUndefined(funcs[result.fCurrencyId])) {
                        return;
                    }
                    funcs[result.fCurrencyId] = (function(next) {
                        currencyService.getCurrencyById(result.fCurrencyId, function(currency) {
                            if(!_.isUndefined(currency)) {
                                currencies.push(currency);
                            }
                            next();
                        }.bind(this));
                    }.bind(this));
                }, this);

                async.parallel(funcs, function() {
                    callback(null, currencies);
                });
            }.bind(this));
        }.bind(this));
    };

    this.getMarketsCurrencies = function(callback)
    {
        var self = this;
        
        this.getMarkets(function(markets) {
            var results = {},
                funcs = [];
                
            _.each(markets, function(market) {
                funcs.push(function(_marketNext) {
                    self.getMarketCurrencies(market, function(err, marketCurrencies) {
                        if(err) {
                            _marketNext(err);
                        } else {
                            results[market] = marketCurrencies;
                            _marketNext(null);
                        }
                    }); 
                });
            });
            
            async.parallel(funcs, function(err) {
                if(err) {
                    callback(err);
                } else {
                    callback(null, results);
                }
            });
        });
    };

    this.getMarketCurrencies = function(market, callback)
    {
        var self = this;
        
        if(!_.isObject(self._cache.nameMarketsCurrencies) || !_.isObject(self._cache.nameMarketsCurrencies[market])) {
            var getMC = function(market) {
                logger.debug('Get marketCurrencies [ ' + market.name + ' ]', this);
                marketsCurrencyModel.findAll({
                    where: {
                        marketId: market.marketId, 
                    } 
                }).success(function(marketCurrencies) {
                    if(!_.isNull(marketCurrencies)) {
                        var results = {};
                        var funcs = [],
                            currencyService = APP.getService('currency');
                        
                        _.each(marketCurrencies, function(marketCurrency) {
                            funcs.push(function(_mcNext) {
                                async.auto({
                                    'fCurrency': function(_fCurrencyNext) {
                                        currencyService.getCurrencyById(marketCurrency.fCurrencyId, function(err, obj) {
                                            _fCurrencyNext(err, obj);
                                        });
                                    },
                                    'sCurrency': function(_sCurrencyNext) {
                                        currencyService.getCurrencyById(marketCurrency.sCurrencyId, function(err, obj) {
                                            _sCurrencyNext(err, obj);
                                        });
                                    }
                                }, function(err, result) {
                                    if(!err) {
                                        results[result.fCurrency.name + '_' + result.sCurrency.name] = marketCurrency;
                                        results[result.sCurrency.name + '_' + result.fCurrency.name] = marketCurrency;
                                    }
                                    _mcNext(err);
                                });
                            });
                        });
                        
                        async.parallel(funcs, function(err) {
                            if(err) {
                                callback(err);
                                return;
                            }
                            
                            if(!_.isObject(self._cache.nameMarketsCurrencies)) {
                                self._cache.nameMarketsCurrencies = {};
                            }
                            self._cache.nameMarketsCurrencies[market.name] = results;    
                            callback(null, results);
                        });
                    } else {
                        callback(null, null);
                    }
                });
            };

            if(_.isString(market)) {
                this.getMarketByName(market, function(err, result) {
                    if(err) {
                        callback(err);
                        return;
                    }
                    getMC(result);
                });
            } else {
                getMC(market);
            }
        } else {
            callback(null, this._cache.nameMarketsCurrencies[market]);
        }
    };

    this.cleanMarketsCurrenciesCache = function()
    {
        this._cache.nameMarketsCurrencies = null;
    };

    this.getMarketCurrency = function(market, fCurrency, sCurrency, callback)
    {
        var self = this,
            sfCurrency = null,
            ssCurrency = null,
            sMarket = null;
        
        if(_.isObject(fCurrency)) {
            sfCurrency = fCurrency.name;
        } else {
            sfCurrency = fCurrency.toUpperCase();
        }
        
        if(_.isObject(sCurrency)) {
            ssCurrency = sCurrency.name;
        } else {
            ssCurrency = sCurrency.toUpperCase();
        }
        
        if(_.isObject(market)) {
            sMarket = market.name;
        } else {
            sMarket = market.toUpperCase();
        }
            
        if(_.isObject(self._cache.nameMarketsCurrencies) && 
           _.isObject(self._cache.nameMarketsCurrencies[sMarket]) && 
           _.isObject(self._cache.nameMarketsCurrencies[sMarket][sfCurrency + '_' + ssCurrency])
        ) {
            callback(null, self._cache.nameMarketsCurrencies[sMarket][sfCurrency + '_' + ssCurrency]);
            return;
        }
        
        async.auto({
            market: function(next) {
                if(_.isString(market)) {
                    this.getMarketByName(market, function(err, result) {
                        next(err, result);
                    });
                } else {
                    next(null, market);
                }
            }.bind(this),
            fCurrency: function(next) {
                if(_.isString(fCurrency)) {
                    currencyService.getCurrencyByName(fCurrency, function(err, result) {
                        next(err, result);
                    });
                } else {
                    next(null, fCurrency);
                }
            }.bind(this),
            sCurrency: function(next) {
                if(_.isString(sCurrency)) {
                    currencyService.getCurrencyByName(sCurrency, function(err, result) {
                        next(err, result);
                    });
                } else {
                    next(null, sCurrency)
                }
            }.bind(this)
        }, function(err, results) {
            if(err) {
                callback(err, null);
                return;
            }

            logger.debug('Get marketCurrency [ ' + results.market.name + ', ' + results.fCurrency.name + ', ' + results.sCurrency.name + ' ]', this);
            marketsCurrencyModel.find({
                where: {
                    marketId: results.market.marketId, 
                    fCurrencyId: results.fCurrency.currencyId,
                    sCurrencyId: results.sCurrency.currencyId
                } 
            }).success(function(marketCurrency) {
                if(_.isNull(marketCurrency)) {
                    marketsCurrencyModel.find({
                        where: {
                            marketId: results.market.marketId, 
                            fCurrencyId: results.sCurrency.currencyId,
                            sCurrencyId: results.fCurrency.currencyId
                        } 
                    }).success(function(marketCurrency) {
                        if(_.isNull(marketCurrency)) {
                            callback('MarketCurrency [ ' + results.market.name + ', ' + results.fCurrency.name + ', ' + results.sCurrency.name + ' ] does not exists', null)
                        } else {
                            if(!_.isObject(self._cache.nameMarketsCurrencies)) {
                                self._cache.nameMarketsCurrencies = {};
                            }
                            if(!_.isObject(self._cache.nameMarketsCurrencies[results.market.name])) {
                                self._cache.nameMarketsCurrencies[results.market.name] = {};
                            }  
                            self._cache.nameMarketsCurrencies[results.market.name][results.fCurrency.name + '_' + results.sCurrency.name] = marketCurrency;
                            self._cache.nameMarketsCurrencies[results.market.name][results.sCurrency.name + '_' + results.fCurrency.name] = marketCurrency;
                            
                            callback(null, marketCurrency);
                        }
                    });
                } else {
                    if(!_.isObject(self._cache.nameMarketsCurrencies)) {
                        self._cache.nameMarketsCurrencies = {};
                    }
                    if(!_.isObject(self._cache.nameMarketsCurrencies[results.market.name])) {
                        self._cache.nameMarketsCurrencies[results.market.name] = {};
                    } 
                    self._cache.nameMarketsCurrencies[results.market.name][results.fCurrency.name + '_' + results.sCurrency.name] = marketCurrency;
                    self._cache.nameMarketsCurrencies[results.market.name][results.sCurrency.name + '_' + results.fCurrency.name] = marketCurrency;
                    
                    callback(null, marketCurrency);
                }
            });
        }.bind(this));
    };

    this.getMarketTradeOrderByMaxTid = function(_marketsCurrency, callback)
    {
        logger.debug('Get max tid [ ' + _marketsCurrency.id + " ]", this)
        marketTradeModel.find({
            where: {
                marketsCurrencyId: _marketsCurrency.id
            }, 
            order: 'tid DESC' 
        }).success(callback);
    },

    this.getLastMarketTradeByNames = function(marketName, fCurrency, sCurrency, callback)
    {
        logger.debug('Get lastMarketTradeByNames [ ' + marketName + ', ' + fCurrency + ', ' + sCurrency + ' ]', this);

        this.getMarketsCurrency(marketName, fCurrency, sCurrency, function(result) {
            if(_.isUndefined(result)) {
                callback(true, null);
                return;
            }

            this.getLastMarketTradeByMarketsCurrency(result, callback);
        }.bind(this));
    };

    this.getLastMarketTradeByMarketsCurrency = function(marketsCurrency, callback)
    {
        logger.debug('Get lastMarketTradeByMarketsCurrency [ ' + marketsCurrency.id + ' ]', this);
        marketTradeModel.find({ 
            where: { 
                "marketsCurrencyId": marketsCurrency.id 
            }, 
            order: "createdAt DESC" 
        }).success(callback);
    };

    /* ---------------------------------------------------------------------- */

    this.collectFee = function(marketsCurrency, data, callback)
    {
        logger.debug('Collect Fee { value: ' + data.value + ", timestamp: " + data._workerTimestamp + " }", this);
        this.getLastFee(marketsCurrency, function(obj) {
            if(_.isUndefined(obj)) {
                this._insertFee(marketsCurrency, data.value, data._workerTimestamp, callback);
            } else {
                if(obj.value !== data.value) {
                    this._insertFee(marketsCurrency, data.value, data._workerTimestamp, callback);
                } else {
                    this._updateFee(obj, data._workerTimestamp, callback);
                }
            }
        }.bind(this));
    };

    this.collectDepth = function(marketsCurrency, data, callback)
    {
        callback();
    };

    this.collectTrade = function(marketsCurrency, data, callback)
    {
        logger.debug('Collect trade { price: ' + data.price + ', amount: ' + data.amount + ', tid: ' + data.tid + ', isAsk: ' + data.isAsk + ', date: ' +  data.date + '}', this);

        marketTradeModel.create({
            'createdAt': data.date,
            'price': data.price,
            'amount': data.amount,
            'tid': data.tid,
            'isAsk': data.isAsk,
            'marketsCurrencyId': marketsCurrency.id
        }).success(callback);
    };
    
    this.collectTrades = function(trades, callback)
    {
        logger.debug('Collect trades (' + trades.length + ')')
        marketTradeModel.bulkCreate(trades).success(callback);
    };

    /* --------------------------------------------- */

    var _insertFee = function(_marketsCurrency, _value, _time, callback)
    {
        logger.debug('Insert fee [ ' + _marketsCurrency.id + ', ' + _value + ', ' + _time + ' ]', MarketService.prototype);
        marketFeeModel.create({
            'marketsCurrencyId': _marketsCurrency.id,
            'value' : parseFloat(_value),
            'createAt' : new Date(_time)
        }).success(callback);
    };

    var _updateFee = function(_obj, _time, callback) 
    {
        logger.debug('Update fee [ ' + _obj.marsCurId + ', ' + _time + ' ]', MarketService.prototype);
        _obj.dateUpdated = new Date(_time);
        _obj.save().success(callback);
    }
};

util.inherits(MarketService, AbstractService);
MarketService.prototype.className = 'services.Market';

module.exports = MarketService;