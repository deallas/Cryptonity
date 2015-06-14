var AbstractResource = require(CORE_PATH + '/AbstractResource.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    async = require('async'),
    fs = require('fs'),
    util = require('util');

var InstallResource = function(options) {
    InstallResource.super_.call(this, options);
    
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
                    logger.warn('Application is already installed', this);
                    process.exit();
                } else {
                    _eventNext();
                }
            }.bind(this));
        }.bind(this), _next);
    };
    
    this.start = function(_next)
    {
        var self = this;
        
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            var database = self.getDependency('resources.Database');
                schema = database.getSchema(),
                force = false,
                models = database.getModels(),
                funcs = {};

            if (APP_ENV === 'development') {
                force = true;
            }

            _.each(_.keys(models), function(name) {
                if(_.isUndefined(models[name].preCreateTable)) {
                    return;
                }
                funcs[name] = []
                if(_.isArray(models[name].dependencies)) {
                    funcs[name] = models[name].dependencies;
                }
                funcs[name].push(models[name].preCreateTable);
            }.bind(this));

            async.auto(funcs, function() {
                logger.info('PreCreate table complete');

                schema.sync({force: force})
                    .complete(function(err) {
                        if (!!err) {
                            logger.error('An error occurred while create the table: ' + err, self);
                        } else {
                            logger.info('Create tables complete');

                            funcs = {};
                            _.each(_.keys(models), function(name) {
                                if(_.isUndefined(models[name].postCreateTable)) {
                                    return;
                                }
                                funcs[name] = []
                                if(_.isArray(models[name].dependencies)) {
                                    funcs[name] = models[name].dependencies;
                                }
                                funcs[name].push(models[name].postCreateTable);
                            }.bind(this));

                            async.auto(funcs, function() {
                                logger.info('PostCreate table complete', self);
                                fs.openSync(self.options.installFile, 'w');
                                _eventNext();
                            }.bind(this));
                        }
                    }.bind(this))
            }.bind(this));
        }, _next);
    };
};

util.inherits(InstallResource, AbstractResource);
InstallResource.prototype.className = 'resources.Install';
InstallResource.prototype.dependencies = [ 'resources.Database' ];  

module.exports = InstallResource;