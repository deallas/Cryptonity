var Options = require(CORE_PATH + '/Options.js'),
    extUtil = require(CORE_PATH + '/Utils.js');

var AbstractService = function(options) {
    extUtil.implements(this, Options);
    this.appendOptions(options);
    
    /* ---------------------------------------------------------------------- */
    
    this._cache = {};
    
    /* ---------------------------------------------------------------------- */
    
    this.cleanCache = function() 
    {
        this._cache = {};
    };
}
AbstractService.prototype.className = 'core.AbstractService';

module.exports = AbstractService;