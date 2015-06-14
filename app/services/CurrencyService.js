var AbstractService = require(APP_PATH + '/core/AbstractService.js'),
    logger = require(APP_PATH + '/core/Logger.js');
    
var CurrencyService = function(options) {
    CurrencyService.super_.call(this, options);
    
    /* ---------------------------------------------------------------------- */
    
    var db = APP.getResource('database'),
        currencyModel = db.getModel('currency');

    /* ---------------------------------------------------------------------- */
    
    this.getCurrencyById = function(id, callback)
    {
        logger.debug('Get currency by id [ ' + id + ' ]', this);
        if(!_.isObject(this._cache.currencies) || !_.isObject(this._cache.currencies[id])) {
            var self = this;
            
            currencyModel.find({
                where: { 
                    'currencyId' : id 
                } 
            }).success(function(result) {
                if(_.isNull(result)) {
                    callback('Currency id "' + id + '" does not exists', null);
                } else {
                    if(!_.isObject(self._cache.currencies)) {
                        self._cache.currencies = {};
                        self._cache.nameCurrencies = {};
                    }
                    self._cache.currencies[id] = result;
                    self._cache.nameCurrencies[result.name] = result;
                    
                    callback(null, self._cache.currencies[id]);
                }
            });
        } else {
            callback(null, this._cache.currencies[id]);
        }
    };
    
    this.getCurrencyByName = function(name, callback)
    {
        logger.debug('Get currency by name [ '+ name + ' ]', this);
        name = name.toUpperCase();

        if(!_.isObject(this._cache.nameCurrencies) || !_.isObject(this._cache.nameCurrencies[name])) {
            var self = this;
            
            currencyModel.find({
                where: { 
                    'name' : name.toUpperCase() 
                } 
            }).success(function(result) {
                if(_.isNull(result)) {
                    callback('Currency "' + name + '" does not exists', null);
                } else {
                    if(!_.isObject(self._cache.nameCurrencies)) {
                        self._cache.nameCurrencies = {};
                        self._cache.currencies = {};
                    }
                    self._cache.nameCurrencies[name] = result;
                    self._cache.currencies[result.currencyId] = result;
                    callback(null, self._cache.nameCurrencies[name]);
                }
            });
        } else {
            callback(null, this._cache.nameCurrencies[name]);
        }
    };
    
    this.getCurrencies = function(callback)
    {
        logger.debug('Get currencies', this);
 
        if(!_.isObject(this._cache.nameCurrencies)) { 
            this._cache.nameCurrencies = {};
            this._cache.currencies = {};
            var self = this;
            
            currencyModel.findAll().success(function(rows) {
                _.each(rows, function(row) {
                    self._cache.nameCurrencies[row.name] = row;
                    self._cache.currencies[row.currencyId] = row;
                });
                callback(self._cache.nameCurrencies);
            });
        } else {
            callback(this._cache.nameCurrencies);
        }
    };

    this.cleanCurrenciesCache = function()
    {
        this._cache.nameCurrencies = null;
        this._cache.currencies = null;
    };
}

util.inherits(CurrencyService, AbstractService);
CurrencyService.prototype.className = 'services.Currency';

module.exports = CurrencyService;