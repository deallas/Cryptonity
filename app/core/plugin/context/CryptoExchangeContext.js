var Options = require(CORE_PATH + '/Options.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');

var CryptoExchangeContext = function() 
{   
    var _exchangeObj = null;
    
    /* ---------------------------------------------------------------------- */
    
    this.preImplement = function(obj) {
        if(!extUtil.isImplemented(obj, Options)) {
            extUtil.implement(obj, Options);
        }

        obj.options = _.extend({ 'pairs': null }, obj.options);
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.getSupportedCurrencies = function()
    {
        return _.extend(this.getSupportedClassicCurrencies(), this.getSupportedCryptoCurrencies());
    };

    this.getSupportedCurrencyPairs = function()
    {
        return _.extend(this.getSupportedClassicCurrencyPairs(), this.getSupportedCryptoCurrencyPairs());
    };
    
    this.getCurrenciesPairs = function()
    {
        if(!_.isObject(this.options.pairs) || _.keys(this.options.pairs).length === 0) {
            return this.getSupportedCurrencyPairs();
        }
        
        return this.options.pairs;
    };

    this.getSupportedClassicCurrencies = function()
    {
        return _.keys(this.getSupportedClassicCurrencyPairs());
    };

    this.getSupportedCryptoCurrencies = function()
    {
        return _.keys(this.getSupportedCryptoCurrencyPairs());
    };

    this.getExchangeObject = function(_next)
    {
        if(!_.isNull(_exchangeObj)) {
            _next(_exchangeObj);
        } else {
            var marketService = APP.getService('market'),
                exchangeName = this.getExchangeName();
                
            marketService.getMarketByName(exchangeName, function(err, obj) {
                if(err) {
                    logger.error(err, this);
                }
                _exchangeObj = obj;
                
                _next(_exchangeObj);
            }.bind(this));
        }
    };

    this.getExchangeCurrencyPair = function(fCurrency, sCurrency, _next)
    {
        var self = this;
        
        this.getExchangeObject(function() {
            var marketService = APP.getService('market');
            marketService.getMarketCurrency(_exchangeObj, fCurrency, sCurrency, function(err, obj) {
                if(!_.isNull(err)) {
                    logger.error(err, self);
                    _next(null);
                } else {
                    _next(obj);
                }
            });
        });
    };

    /* ---------------------------------------------------------------------- */
    
    this.getExchangeName = function() 
    {
        throw new Error("Not implemented yet");
    };
    
    this.getSupportedClassicCurrencyPairs = function()
    {
        throw new Error("Not implemented yet");
    };
    
    this.getSupportedCryptoCurrencyPairs = function()
    {
        throw new Error("Not implemented yet");
    };
}

module.exports = CryptoExchangeContext;