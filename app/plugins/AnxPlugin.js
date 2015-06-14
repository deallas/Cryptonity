var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    JsonWorker = require(CORE_PATH + '/plugin/spider/worker/JsonWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    util = require('util');

var AnxPlugin = function(options) 
{
    AnxPlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

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
        // TODO
    };

    this.getExchangeName = function()
    {
        return 'ANX';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "USD" : [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "HKD": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "EUR": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "CAD": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "AUD": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "SGD": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "JPY": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "CHF": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "GBP": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ],
            "NZD": [
                "BTC", "LTC", "PPC", "NMC", "DOGE"
            ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC" : [
                "USD", "HKD", "EUR", "CAD", "AUD", "SGD", "JPY", "CHF", "GBP", "NZD", "LTC", "PPC", "NMC", "DOGE"
            ],
            "LTC" : [
                "BTC", "USD", "HKD", "EUR", "CAD", "AUD", "SGD", "JPY", "CHF", "GBP", "NZD", "PPC", "NMC"
            ],
            "PPC": [
                "BTC", "LTC", "USD", "HKD", "EUR", "CAD", "AUD", "SGD", "JPY", "CHF", "GBP", "NZD"
            ],
            "NMC" : [
                "BTC", "LTC", "USD", "HKD", "EUR", "CAD", "AUD", "SGD", "JPY", "CHF", "GBP", "NZD"
            ],
            "DOGE": [
                "BTC", "USD", "HKD", "EUR", "CAD", "AUD", "SGD", "JPY", "CHF", "GBP", "NZD"
            ]
        };
    };
}

util.inherits(AnxPlugin, AbstractPlugin);
AnxPlugin.prototype.className = 'plugins.Btce';
AnxPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = AnxPlugin;