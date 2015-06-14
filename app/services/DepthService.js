var AbstractService = require(APP_PATH + '/core/AbstractService.js'),
    logger = require(APP_PATH + '/core/Logger.js'),
    async = require('async');

var DepthService = function(options) {
    DepthService.super_.call(this, options);
};

util.inherits(DepthService, AbstractService);
DepthService.prototype.className = 'services.Depth';

module.exports = DepthService;