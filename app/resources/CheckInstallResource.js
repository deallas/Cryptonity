var AbstractResource = require(CORE_PATH + '/AbstractResource.js'),
    logger = require(CORE_PATH + '/Logger.js');
    util = require('util'),
    fs = require('fs');

var CheckInstallResource = function(options)
{
    CheckInstallResource.super_.call(this, options);
    
    /* ---------------------------------------------------------------------- */
    
    this.configure = function(_next)
    {
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            if(_.isUndefined(this.options.installFile)) {
                throw new Error('Install file is not defined');
            }

            fs.exists(this.options.installFile, function(exists) {
                if (exists) {
                    _eventNext();
                } else {
                    logger.warn('Application has been not installed', this);
                    process.exit(0);
                }
            }.bind(this));
        }.bind(this), _next);
    }
}

util.inherits(CheckInstallResource, AbstractResource);
CheckInstallResource.prototype.className = 'resources.CheckInstall';
CheckInstallResource.prototype.dependencies = [];

module.exports = CheckInstallResource;