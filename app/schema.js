var schema = APP.getResource('database').getSchema(),
    async = require('async'),
    Sequelize = require('sequelize');

/* -------------------------------------------------------------------------- */

var Currency = schema.define('Currency', {
    currencyId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING(30), allowNull: false },
    order: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0 },
    isCrypto: { type: Sequelize.BOOLEAN, allowNull: false }
}, {
    tableName: 'currencies',
    timestamps: false
});

Currency.postCreateTable = function(next, data)
{
    var currencies = [
        {
            'name' : 'USD',
            'order' : 10,
            'isCrypto' : false
        },
        {
            'name' : 'PLN',
            'order' : 20,
            'isCrypto' : false
        },
        {
            'name' : 'EUR',
            'order' : 30,
            'isCrypto' : false
        },
        {
            'name' : 'RUB',
            'order' : 40,
            'isCrypto' : false
        },
        {
            'name' : 'GBP',
            'order' : 50,
            'isCrypto' : false
        },
        {
            'name' : 'JPY',
            'order' : 60,
            'isCrypto' : false
        },
        {
            'name' : 'CAD',
            'order' : 70,
            'isCrypto' : false
        },
        {
            'name' : 'CHF',
            'order' : 80,
            'isCrypto' : false
        },
        {
            'name' : 'AUD',
            'order' : 90,
            'isCrypto' : false
        },
        {
            'name' : 'SEK',
            'order' : 100,
            'isCrypto' : false
        },
        {
            'name' : 'DKK',
            'order' : 110,
            'isCrypto' : false
        },
        {
            'name' : 'HKD',
            'order' : 120,
            'isCrypto' : false
        },
        {
            'name' : 'CNY',
            'order' : 130,
            'isCrypto' : false
        },
        {
            'name' : 'SGD',
            'order' : 140,
            'isCrypto' : false
        },
        {
            'name' : 'THB',
            'order' : 150,
            'isCrypto' : false
        },
        {
            'name' : 'NZD',
            'order' : 160,
            'isCrypto' : false
        },
        {
            'name' : 'NOK',
            'order' : 170,
            'isCrypto' : false
        },

        // ---->

        {
            'name' : 'BTC',
            'order' : 10,
            'isCrypto' : true
        },
        {
            'name' : 'LTC',
            'order' : 20,
            'isCrypto' : true
        },
        {
            'name' : 'FTC',
            'order' : 30,
            'isCrypto' : true
        },
        {
            'name' : 'NMC',
            'order' : 40,
            'isCrypto' : true
        },
        {
            'name' : 'TRC',
            'order' : 50,
            'isCrypto' : true
        },
        {
            'name' : 'PPC',
            'order' : 60,
            'isCrypto' : true
        },
        {
            'name' : 'NVC',
            'order' : 70,
            'isCrypto' : true
        },
        {
            'name' : 'XPM',
            'order' : 80,
            'isCrypto' : true
        }
    ];

    var funcs = [],
        currsObj = {};

    _.each(currencies, function(currency) {
        funcs.push(function(_next) {
            Currency.create(currency).success(function(currObj) {
                currsObj[currObj.name] = currObj;
                _next();
            });
        }.bind(this));
    }.bind(this));
    
    async.parallel(funcs,function() { 
        next(null, currsObj); 
    });
}

/* -------------------------------------------------------------------------- */

var Market = schema.define('Market', {
    marketId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING(30), allowNull: false },
    order: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0 },
    url: Sequelize.STRING(100)
}, {
    tableName: 'markets',
    timestamps: false
});

Market.postCreateTable = function(next, data)
{
    var markets = [
        {
            'name' : 'OKCOIN',
            'order' : 10,
            'url' : 'https://www.okcoin.com'
        },
        {
            'name' : 'HUOBI',
            'order' : 20,
            'url' : 'https://www.huobi.com'
        },
        {
            'name' : 'BTCCHINA',
            'order' : 30,
            'url' : 'https://vip.btcchina.com'
        },
        {
            'name' : 'BITFINEX',
            'order' : 40,
            'url' : 'https://www.bitfinex.com'
        },
        {
            'name' : 'BITSTAMP',
            'order' : 50,
            'url' : 'https://www.bitstamp.net'
        },
        {
            'name' : 'BTCE',
            'order' : 60,
            'url' : 'https://btc-e.com'
        },
        {
            'name' : 'BITCUREX',
            'order' : 70,
            'url' : 'https://bitcurex.com'
        },
        {
            'name' : 'BITMARKET',
            'order' : 80,
            'url' : 'https://www.bitmarket.pl'
        }
    ];

    var funcs = [],
        marksObj = {};

    _.each(markets, function(market) {
        funcs.push(function(_next) {
            Market.create(market).success(function(markObj) {
                marksObj[markObj.name] = markObj; 
                _next();
            });
        }.bind(this));
    }.bind(this));

    async.parallel(funcs,function() { next(null, marksObj); });
}

/* -------------------------------------------------------------------------- */

var MarketDepth = schema.define('MarketDepth', {
    marketDepthId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    price: { type: Sequelize.FLOAT, allowNull: false },
    amount: { type: Sequelize.FLOAT, allowNull: false },
    marketsCurrencyId: Sequelize.INTEGER.UNSIGNED
}, {
    tableName: 'marketDepths',
    timestamps: false
});

MarketDepth.dependencies = [ 'marketsCurrency' ];
MarketDepth.postCreateTable = function(next, data)
{
    schema.query('ALTER TABLE marketDepths ENGINE = TokuDB').success(function(err) {
        if(err) {
            logger.error(err);
        }
        next();
    });
}

/* -------------------------------------------------------------------------- */

var MarketFee = schema.define('MarketFee', {
    marketFeeId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    value: { type: Sequelize.FLOAT, allowNull: false },
    marketsCurrencyId: Sequelize.INTEGER.UNSIGNED
}, {
    tableName: 'marketFees'
});

MarketFee.dependencies = [ 'marketsCurrency' ];
MarketFee.postCreateTable = function(next, data)
{
    schema.query('ALTER TABLE marketFees ENGINE = TokuDB').success(function(err) {
        if(err) {
            logger.error(err);
        }
        next();
    });
}

/* -------------------------------------------------------------------------- */

var MarketTrade = schema.define('MarketTrade', {
    marketTradeId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    price: { type: Sequelize.FLOAT, allowNull: false },
    amount: { type: Sequelize.FLOAT, allowNull: false },
    tid: Sequelize.INTEGER.UNSIGNED,
    isAsk: Sequelize.BOOLEAN,
    createdAt: { type: Sequelize.DATE, allowNull: false },
    marketsCurrencyId: Sequelize.INTEGER.UNSIGNED
}, {
    tableName: 'marketTrades',
    timestamps: false
});

MarketTrade.dependencies = [ 'marketsCurrency' ];
MarketTrade.postCreateTable = function(next, data)
{
    async.waterfall([
        function(_next) {
            schema.query('ALTER TABLE marketTrades ENGINE = TokuDB').success(function() {
                _next();
            });
        },
        function(_next) {
            schema.query('ALTER TABLE marketTrades ADD CLUSTERING INDEX marketTradesMarketTid (marketsCurrencyId, tid)').success(function() {
                _next();
            });
        },
        function(_next) {
            schema.query('ALTER TABLE marketTrades ADD INDEX marketTradesMarketCreatedAt (marketsCurrencyId, createdAt)').success(function() {
                _next();
            });
        }
    ], function (err, result) {
        if(err) {
            logger.error(err);
        }
        next();  
    });
}

/* -------------------------------------------------------------------------- */

var MarketStats = schema.define('MarketStats', {
    marketStatsId: { 
        type:           Sequelize.INTEGER.UNSIGNED, 
        primaryKey:     true, 
        autoIncrement:  true 
    },
    intervalType:       Sequelize.ENUM(
                            '1m', '2m', '5m', '15m', '30m', '45m', 
                            '1H', '2H', '4H', '8H', '12H', '16H', 
                            '1D', '2D', '3D', '1W', '2W', '1M',
                            '2M', '3M', '4M', '6M', '1Y', '2Y'
                        ),
    createdAt: { 
        type:           Sequelize.DATE, 
        allowNull:      false 
    },
    minPrice:           Sequelize.FLOAT,
    maxPrice:           Sequelize.FLOAT,
    avgPrice:           Sequelize.FLOAT,
    weightedAvgPrice:   Sequelize.FLOAT,
    openPrice:          Sequelize.FLOAT,
    closePrice:         Sequelize.FLOAT,
    sumAmount:          Sequelize.STRING.BINARY,
    sumPrice:           Sequelize.STRING.BINARY,
    sumAmountMPrice:    Sequelize.STRING.BINARY,
    totalTransactions:  Sequelize.INTEGER.UNSIGNED,
    marketsCurrencyId:  Sequelize.INTEGER.UNSIGNED
}, {
    tableName:          'marketStats',
    timestamps:         false
});

MarketStats.dependencies = [ 'marketsCurrency' ];
MarketStats.postCreateTable = function(next, data)
{
    async.waterfall([
        function(_next) {
            schema.query('ALTER TABLE marketStats ENGINE = TokuDB').success(function() {
                _next();
            });
        },
        function(_next) {
            schema.query('ALTER TABLE marketStats ADD INDEX marketStatsInterval (marketsCurrencyId, intervalType, createdAt)').success(function() {
                _next();
            });
        }
    ], function (err, result) {
        next();  
    });
}

/* -------------------------------------------------------------------------- */

var MarketsCurrency = schema.define('MarketsCurrency', {
    marketId: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: "markets",
        referencesKey: "marketId"
    },
    fCurrencyId: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: "currencies",
        referencesKey: "currencyId"
    },
    sCurrencyId: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: "currencies",
        referencesKey: "currencyId"
    }
}, {
    tableName: 'marketsCurrencies',
    timestamps: false
});

MarketsCurrency.dependencies = [ 'currency', 'market' ];
MarketsCurrency.postCreateTable = function(next, data)
{
    var currencies = data['currency'],
        markets = data['market'],
        funcs = [];

    _.each(_.keys(markets), function(key) {
        var plugin = APP.getPlugin(markets[key].name.toLowerCase()),
            pairs = plugin.getSupportedCurrencyPairs();

        var revPairs = {};
        _.each(_.keys(pairs), function(fCurrency) {
            if(_.isString(pairs[fCurrency])) {
                pairs[fCurrency] = [pairs[fCurrency]];
            }

            if(_.isArray(pairs[fCurrency])) {
                _.each(pairs[fCurrency], function(sCurrency) {
                    if(_.isArray(revPairs[fCurrency]) && revPairs[fCurrency].indexOf(sCurrency) >= 0) {
                        return;
                    }
                    
                    if(_.isArray(revPairs[sCurrency])) {
                        if(revPairs[sCurrency].indexOf(fCurrency) >= 0) {
                            if(!_.isArray(revPairs[fCurrency])) {
                                revPairs[fCurrency] = [];
                            }
                            if(revPairs[fCurrency].indexOf(sCurrency) === -1) {
                                revPairs[fCurrency].push(sCurrency);
                            }
                            return;
                        }
                    } else {
                        revPairs[sCurrency] = [];
                    }
                    revPairs[sCurrency].push(fCurrency);
                    
                    if(!_.isArray(revPairs[fCurrency])) {
                        revPairs[fCurrency] = [];
                    }
                    revPairs[fCurrency].push(sCurrency);
                    
                    funcs.push(function(_next) {
                        MarketsCurrency.create({
                            fCurrencyId : currencies[fCurrency].currencyId,
                            sCurrencyId : currencies[sCurrency].currencyId,
                            marketId : markets[key].marketId
                        }).success(_next);
                    }.bind(this));
                }.bind(this));
            } else {
                throw new Error('Unsupported pair format');
            }
        }.bind(this));
    }.bind(this));
    async.parallel(funcs, function() { next() });
}

/* -------------------------------------------------------------------------- */

MarketsCurrency.hasMany(MarketDepth, { as: 'marketDepths' });
MarketsCurrency.hasMany(MarketFee, { as: 'marketFees' });
MarketsCurrency.hasMany(MarketStats, { as: 'marketStats' });
MarketsCurrency.hasMany(MarketTrade, { as: 'marketTrades' });

Currency.hasMany(MarketsCurrency, { as: 'fMarketsCurrencies', 'foreignKey': 'fCurrencyId' });
Currency.hasMany(MarketsCurrency, { as: 'sMarketsCurrencies', 'foreignKey': 'sCurrencyId' });
Market.hasMany(MarketsCurrency, { as: 'marketsCurrencies' });

/* -------------------------------------------------------------------------- */

module.exports = {
    'currency' : Currency,
    'market' : Market,
    'marketDepth' : MarketDepth,
    'marketFee' : MarketFee,
    'marketStats' : MarketStats,
    'marketTrade' : MarketTrade,
    'marketsCurrency' : MarketsCurrency
};