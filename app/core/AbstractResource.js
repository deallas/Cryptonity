var ObjectLifetime = require(CORE_PATH + '/ObjectLifetime.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js'),
    util = require('util');
    
var AbstractResource = function(options) {
    AbstractResource.super_.call(this, options);
    
    this.resourceConfig = {};
    
    /* ---------------------------------------------------------------------- */

    this.configure = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            this.loadResourceConfig(_eventNext);
        }.bind(this), _next);
    };

    this.stop = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            this.saveResourceConfig(_eventNext);
        }.bind(this), _next);
    };

    /* ---------------------------------------------------------------------- */

    this.saveResourceConfig = function(callback)
    {
        var resourceFilename = DATA_PATH + '/' + APP.getName() + '.' + this.className + '.json';
        extUtil.saveConfig(resourceFilename, this.resourceConfig, callback);
    };
    
    this.loadResourceConfig = function(callback)
    {
        var resourceFilename = DATA_PATH + '/' + APP.getName() + '.' + this.className + '.json';
        extUtil.loadConfig(resourceFilename, function(err, data) {
            if(err) {
                logger.warn(err, this);
                this.resourceConfig = {};
            } else {
                this.resourceConfig = data;
            }
            callback();
        }.bind(this));
    };
}

util.inherits(AbstractResource, ObjectLifetime);
AbstractResource.prototype.className = 'core.AbstractResource';

module.exports = AbstractResource;