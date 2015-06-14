var AbstractService = require(APP_PATH + '/core/AbstractService.js'),
    logger = require(APP_PATH + '/core/Logger.js'),
    async = require('async');

var StatsService = function(options) {
    StatsService.super_.call(this, options);
};

util.inherits(StatsService, AbstractService);
StatsService.prototype.className = 'services.Stats';

module.exports = StatsService;