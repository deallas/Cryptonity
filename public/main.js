require.config({
    paths: {
        "jquery": [
            "http://ajax.googleapis.com/ajax/libs/jquery/1.10/jquery.min",
            "libs/jquery/jquery.min"
        ],
        "underscore": "libs/underscore/underscore-min",
        "backbone": "libs/backbone/backbone-min"
    },
    shim: {
        "backbone": {
            deps: ["jquery", "underscore"],
            exports: "Backbone"
        }
    },
    waitSeconds: 10
});

require(['jquery', 'underscore', 'backbone', 'app'], function(jquery, _, Backbone, App){
    new App;
});