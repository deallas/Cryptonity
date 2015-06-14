var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    JsonWorker = require(CORE_PATH + '/plugin/spider/worker/JsonWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    util = require('util');

var BtcePlugin = function(options) 
{
    BtcePlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

    this.options = _.extend({ 'cronTime': '*/3 * * * * *', 'timeZone': 'Europe/London' }, this.options);

    /* ---------------------------------------------------------------------- */

    var _spiderPairs = {
        "BTC" : [
            "USD", "RUB", "EUR", "CNY", "GBP"
        ],
        "LTC" : [
            "BTC", "USD", "RUB", "EUR", "CNY", "GBP"
        ],
        "NMC" : [
            "BTC", "USD"
        ],
        "NVC": [
            "BTC", "USD"
        ],
        "USD" : [
            "RUB", "CNY"
        ],
        "EUR": [
            "USD", "RUB"
        ],
        "TRC": [
            "BTC"
        ],
        "PPC": [
            "BTC", "USD"
        ],
        "FTC": [
            "BTC"
        ],
        "XPM": [
            "BTC"
        ],
        "GBP": [
            "USD"
        ]
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
                
                this.bindChild('btce_trade_' + fCurrency + '_' + sCurrency, new JsonWorker({
                    'cronTime' : self.options.cronTime,
                    'timeZone': self.options.timeZone,
                    'requestParams' : {
                        host: 'btc-e.com',
                        port: 443,
                        path: '/api/2/' + _fixCurrencyName(fCurrency.toLowerCase()) + '_' + _fixCurrencyName(sCurrency.toLowerCase()) + '/trades',
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
                                    trade.isAsk = trade.trade_type === 'ask';
                                    
                                    delete trade.trade_type;
                                    delete trade.price_currency;
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
        return 'BTCE';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "USD" : [
                "BTC", "LTC", "NMC", "NVC", "RUB", "EUR", "CNY", "GBP", "PPC"
            ],
            "EUR": [
                "BTC", "LTC", "USD", "RUB"
            ],
            "RUB": [
                "BTC", "LTC", "USD", "EUR"
            ],
            "GBP": [
                "BTC", "LTC", "USD"
            ],
            "CNY": [
                "BTC", "LTC", "USD"
            ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC" : [
                "USD", "RUB", "EUR", "CNY", "GBP", "LTC", "NMC", "NVC", "TRC", "PPC", "FTC", "XPM"
            ],
            "LTC" : [
                "BTC", "USD", "RUB", "EUR", "CNY", "GBP"
            ],
            "NMC" : [
                "BTC", "USD"
            ],
            "NVC": [
                "BTC", "USD"
            ],
            "TRC": [
                "BTC"
            ],
            "PPC": [
                "BTC", "USD"
            ],
            "FTC": [
                "BTC"
            ],
            "XPM": [
                "BTC"
            ]
        };
    };
    
    /* ---------------------------------------------------------------------- */
    
    var _fixCurrencyName = function(currency)
    {
        if(currency === 'rub') {
            currency = 'rur';
        } else if(currency === 'cny') {
            currency = 'cnh';
        }

        return currency;
    }
}

util.inherits(BtcePlugin, AbstractPlugin);
BtcePlugin.prototype.className = 'plugins.Btce';
BtcePlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = BtcePlugin;