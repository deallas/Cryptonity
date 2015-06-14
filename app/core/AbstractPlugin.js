var AbstractResource = require(CORE_PATH + '/AbstractResource.js'),
    util = require('util');
    
var AbstractPlugin = function(options) {
    AbstractPlugin.super_.call(this, options);
}

util.inherits(AbstractPlugin, AbstractResource);
AbstractPlugin.prototype.className = 'core.AbstractPlugin';

module.exports = AbstractPlugin;