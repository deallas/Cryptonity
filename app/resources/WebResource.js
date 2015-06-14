var AbstractResource = require(APP_PATH + '/core/AbstractResource.js'),
    extUtil = require(APP_PATH + '/core/Utils.js'),
    async = require('async'),
    express = require('express'),
    util = require('util');

var WebResource = function(options) {
    WebResource.super_.call(this, options);
    
    var _defaultOptions = {
        'ipAddress': '127.0.0.1',
        'port': 3000,
        'publicPath': PUBLIC_PATH,
        'dumpExceptions': false,
        'showStack': false
    };
    
    this.options = _.extend(_defaultOptions, this.options);
    
    /* ---------------------------------------------------------------------- */

    var _server = null;

    /* ---------------------------------------------------------------------- */

    this.configure = function(_next)
    {
        _server = express();
        if(this.options.useCompress) {
            _server.use(express.compress());
        }

        var opts = {
            maxAge: this.options.maxAge
        };

        _server.use(express.static(this.options.publicPath), opts);
        _server.use(express.errorHandler({ dumpExceptions: this.options.dumpExceptions, showStack: this.options.showStack }));

        _next();
    };

    this.start = function(_next) 
    {
        _server.listen(this.options.port, this.options.ipAddress, 511, _next);
    };

    /* ---------------------------------------------------------------------- */

    this.getServer = function() 
    {
        return _server;
    }
};

util.inherits(WebResource, AbstractResource); 
WebResource.prototype.className = 'resources.Web';
WebResource.prototype.dependencies = [];

module.exports = WebResource;