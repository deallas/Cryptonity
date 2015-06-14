var Options = require(CORE_PATH + '/Options.js'),
    extUtil = require(CORE_PATH + '/Utils.js');

var SpiderContext = function() 
{    
    this.preImplement = function(obj) {
        if(!extUtil.isImplemented(obj, Options)) {
            extUtil.implement(obj, Options);
        }

        obj.options = _.extend({ 'autoStartSpider': true }, obj.options);
    };
    
    /* ---------------------------------------------------------------------- */
    
    this.startSpider = function()
    {
        throw new Error('Not implemented yet');
    };
    
    this.stopSpider = function()
    {
        throw new Error('Not implemented yet');
    };
};

module.exports = SpiderContext;