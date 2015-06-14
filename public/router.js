define([
    'jquery',
    'underscore',
    'backbone',
    'views/HomeView',
    'views/CurrencyView'
], function($, _, Backbone, HomeView, CurrencyView){
    var AppRouter = Backbone.Router.extend({
        routes: {
            "*actions":         "defaultAction",
            "currency/:name": 	"currency"
        }
    });

    var initialize = function(){
        var appRouter = new AppRouter;

        appRouter.on('route:defaultAction', function(actions) {
            var homeView = new HomeView();
            homeView.render();
        });

        appRouter.on('route:showCurrency', function(name) {
            var currencyView = new CurrencyView();
            currencyView.render();
        });

        Backbone.history.start();
    };
    return {
        initialize: initialize
    };
});