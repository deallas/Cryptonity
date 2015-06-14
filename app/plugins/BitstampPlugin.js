var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    PusherWorker = require(CORE_PATH + '/plugin/spider/worker/PusherWorker.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    SpiderContext = require(CORE_PATH + '/plugin/context/SpiderContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    util = require('util');

var BitstampPlugin = function(options) 
{
    BitstampPlugin.super_.call(this, options);
    extUtil.implements(this, [ CryptoExchangeContext, SpiderContext ]);

    /* ---------------------------------------------------------------------- */

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
        var fCurrency = 'USD';
        var sCurrency = 'BTC';
        var bufRemoteEvent = this.getDependency('resources.BufRemoteEvent');

        if(_.isUndefined(this.resourceConfig['max_' + fCurrency + '_' + sCurrency])) {
            self.resourceConfig['max_' + fCurrency + '_' + sCurrency] = 0;
        }

        this.bindChild('bitstamp_trade_' + fCurrency + '_' + sCurrency, new PusherWorker({
            'apiKey': 'de504dc5763aeef9ff52',
            'channel': 'live_trades',
            'name': 'trade',
            'collect': function(trade) {                                
                trade.fCurrency = fCurrency;
                trade.sCurrency = sCurrency;
                trade.date = new Date(); // NOT SUPPORTED :(
                trade.isAsk = null; // NOT SUPPORTED :(
                trade.tid = trade.id;

                delete trade.id;

                bufRemoteEvent.appendData('exchange_trade', { object: self.className, data: trade }, null, false, function(timestamp) {
                    if(!timestamp) {
                        logger.warn('Error while append data', self);
                    } else {
                        bufRemoteEvent.publish('exchange_trade', new Date().getTime());
                    }
                });
            }
        }));
    };

    this.getExchangeName = function()
    {
        return 'BITSTAMP';
    };

    this.getSupportedClassicCurrencyPairs = function()
    {
        return {
            "USD": [ "BTC" ]
        };
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        return {
            "BTC" : [ "USD" ]
        };
    };
}

util.inherits(BitstampPlugin, AbstractPlugin);
BitstampPlugin.prototype.className = 'plugins.Bitstamp';
BitstampPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent' ];   

module.exports = BitstampPlugin;