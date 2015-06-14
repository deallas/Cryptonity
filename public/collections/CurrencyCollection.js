define([
    'backbone',
    'models/Currency'
], function(Backbone, Currency) {
    var CurrencyCollection = Backbone.Collection.extend({
        model: Currency,
        url: '/api/currencies'
    });

    return CurrencyCollection;
});