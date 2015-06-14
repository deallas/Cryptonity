var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js'),
    CronJob = require('cron').CronJob,
    util = require('util');

var CryptoExchangeStatsPlugin = function(options) 
{
    CryptoExchangeStatsPlugin.super_.call(this, options);
    
    this.options = _.extend({ 'timeZone': 'Europe/London' }, this.options);
    
    /* ---------------------------------------------------------------------- */
    
    var _job = null;
    
    /* ---------------------------------------------------------------------- */
    
    this.configure = function(_next)
    {        
        var self = this;
        var bufRemoteEvent = this.getDepedency('resources.BufRemoteEvent');
        
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            _job = new CronJob({
                cronTime: "0 * * * * *",
                start: false,
                timeZone: this.options.timeZone,
                onTick: function() {
                    bufRemoteEvent.addSubscriber()
                }
            });
            _eventNext();
        });
    };
    
    this.start = function(_next)
    {        
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            _job.start();
            _eventNext();
        });
    };
    
    this.stop = function(_next)
    {        
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            _job.stop();
            _eventNext();
        });
    };
};

util.inherits(CryptoExchangeStatsPlugin, AbstractPlugin);
CryptoExchangeStatsPlugin.prototype.className = 'plugins.CryptoExchangeStats';
CryptoExchangeStatsPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent', 'resources.Database' ];   

module.exports = CryptoExchangeStatsPlugin;