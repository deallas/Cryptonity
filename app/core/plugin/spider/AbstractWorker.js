var ObjectLifetime = require(CORE_PATH + '/ObjectLifetime.js'),
    util = require('util');
    
var AbstractWorker = function(options) {
    AbstractWorker.super_.call(this, options);
    
    var _defaultOptions = {
        'collect': function() {}
    }
    this.options = _.extend(_defaultOptions, this.options);
};

util.inherits(AbstractWorker, ObjectLifetime);

module.exports = AbstractWorker;