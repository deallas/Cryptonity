var AbstractPlugin = require(CORE_PATH + '/AbstractPlugin.js'),
    CryptoExchangeContext = require(CORE_PATH + '/plugin/context/CryptoExchangeContext.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js'),
    util = require('util');

var CryptoExchangeWebsocketPlugin = function(options) 
{
    CryptoExchangeWebsocketPlugin.super_.call(this, options);

    /* ---------------------------------------------------------------------- */
}

util.inherits(CryptoExchangeWebsocketPlugin, AbstractPlugin);
CryptoExchangeWebsocketPlugin.prototype.className = 'plugins.CryptoExchangeWebsocket';
CryptoExchangeWebsocketPlugin.prototype.dependencies = [ 'resources.BufRemoteEvent', 'resources.Web', 'resources.Database' ];   

module.exports = CryptoExchangeWebsocketPlugin;