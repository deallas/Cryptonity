define([
    'backbone'
], function(Backbone) {
    var Currency = Backbone.Model.extend({
        urlRoot: '/api/currencies'
    });

    return Currency;
});