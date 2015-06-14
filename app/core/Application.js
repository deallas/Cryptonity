var ObjectLifetime = require(CORE_PATH + '/ObjectLifetime.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    extUtil = require(CORE_PATH + '/Utils.js');
    async = require('async'),
    util = require('util'),
    fs = require('fs');

var Application = function(appName, options)
{
    Application.super_.call(this, options);

    this.options = _.extend({
        'plugins': {},
        'resources': {},
        'services': {}
    }, this.options);

    /* ---------------------------------------------------------------------- */
    
    var _appName = appName,
        _instances = {
            resources :     {},
            services :      {},
            plugins :       {}
        },
        _paths = {
            resources :     {},
            plugins :       {},
            services :      {},
        },
        _availableResources =    {},
        _availablePlugins =      {};
    
    /* ---------------------------------------------------------------------- */

    this.configure = function(_next)
    {
        _next = _next || function() {};
        var self = this;
        
        var configureFunc = function() {
            this.executeEvent('configure', function(_eventNext) {
                async.parallel(
                    [
                        function(taskNext) {
                            extUtil.getModules(SERVICES_PATH, /(.*)Service.js$/, function(results) {
                                _paths.services = {};
                                _.each(_.keys(results), function(service) {
                                    var serviceName = service.split('.')[1];
                                    _paths.services[serviceName.substr(0,1).toLowerCase() + serviceName.substr(1)] = results[service];
                                });
                                taskNext();
                            });
                        },
                        function(taskNext) {
                            extUtil.getModules(RESOURCES_PATH, /(.*)Resource.js$/, function(results) {
                                _availableResources = results;
                                _.each(_.keys(self.options.resources), function(name) {
                                    var className = 'resources.' + name.substr(0,1).toUpperCase() + name.substr(1);
                                    if (_.isUndefined(_availableResources[className])) {
                                        throw new Error('Resource "' + className + '" does not exists');
                                    }
                                    _paths.resources[name] = _availableResources[className];
                                    self.bindChild(className, self.getResource(name));
                                });
                                taskNext();
                            });
                        },
                        function(taskNext) {
                            extUtil.getModules(PLUGINS_PATH, /(.*)Plugin.js$/, function(results) {
                                _availablePlugins = results;
                                _.each(_.keys(self.options.plugins), function(name) {
                                    var className = 'plugins.' + name.substr(0,1).toUpperCase() + name.substr(1);
                                    if (_.isUndefined(_availablePlugins[className])) {
                                        throw new Error('Plugin "' + className + '" does not exists');
                                    }
                                    _paths.plugins[name] = _availablePlugins[className];
                                    self.bindChild(className, self.getPlugin(name));
                                });
                                taskNext();
                            });
                        }
                    ], _eventNext
                );
            }, _next);
        }.bind(this);
        
        if (_.isUndefined(this.options.configFile) && fs.existsSync(CONFIG_PATH + '/' + _appName + '.js')) {
            this.options.configFile = CONFIG_PATH + '/' + _appName + '.js';
        }
        if(!_.isUndefined(this.options.configFile)) {
            extUtil.loadConfig(this.options.configFile, function(err, configFileData) {
                if(err) {
                    logger.error(err, self);
                    process.exit();
                    return;
                }
                this.appendOptions(configFileData); 
                configureFunc();
            }.bind(this));
        } else {
            configureFunc();
        }
    };

    /* ---------------------------------------------------------------------- */

    this.getName = function() { return _appName; }

    this.getObject = function(objectName, onlyPath) {
        if(!_.isString(objectName)) {
            logger.warn('Object name is not be string');
            return false;
        }
        
        var parts = objectName.split('.');
        if(!_.isArray(parts) || parts.length < 2) {
            logger.warn('Invalid format object name "' + objectName + '"');
            return false;
        }
        
        switch(parts[0]) {
            case 'plugins':
                return this.getPlugin(parts[1], onlyPath);
                break;
            case 'resources':
                return this.getResource(parts[1], onlyPath);
                break;
            case 'services':
                return this.getService(parts[1], onlyPath);
                break;
            default:
                logger.warn('Unknown object "' + objectName + '"');
                return false;    
        }
    };

    this.getPlugin = function(pluginName, onlyPath) {
        return _getModule(pluginName, 'plugins', this.options.plugins[pluginName], !!onlyPath);
    };
    
    this.getResource = function(resourceName, onlyPath) {
        return _getModule(resourceName, 'resources', this.options.resources[resourceName], !!onlyPath);
    };
    
    this.getService = function(serviceName, onlyPath) {
        return _getModule(serviceName, 'services', this.options.services[serviceName], !!onlyPath);
    };
    
    this.getResources = function(onlyPath) {
        return _getModules('resources', this.options.resources, !!onlyPath);
    };
    
    this.getPlugins = function(onlyPath) {
        return _getModules('plugins', this.options.plugins, !!onlyPath);
    };
    
    this.getServices = function(onlyPath) {
        return _getModules('services', this.options.services, !!onlyPath);
    };
    
    this.getAvailableResources = function() {
        return _availableResources;
    };
    
    this.getAvailablePlugins = function() {
        return _availablePlugins;
    };
    
    this.getPluginsByContext = function(context)
    {
        var plugins = [];
        
        _.each(this.getPlugins(), function(plugin) {
            if (extUtil.isImplemented(plugin, context)) {
                plugins.push(plugin);
            }
        }.bind(this));

        return plugins;
    };
    
    /* ---------------------------------------------------------------------- */

    var _getModule = function(name, type, options, onlyPath)
    {
        name = name.substr(0,1).toLowerCase() + name.substr(1);
        
        if (_.isUndefined(_paths[type][name])) {
            throw new Error('Module [' + type + '] "' + name + '" does not exists');
        }

        if (onlyPath) {
            return _paths[type][name];
        }

        if (_.isUndefined(_instances[type][name])) {
            _instances[type][name] = new (require(_paths[type][name]))(_.clone(options));
        }

        return _instances[type][name];
    };
    
    var _getModules = function(type, options, onlyPath)
    {
        var result = [];

        _.each(_.keys(_paths[type]), function(name) {
            result.push(_getModule(name, type, options[name], onlyPath));
        });

        return result;
    };
}

util.inherits(Application, ObjectLifetime);
Application.prototype.className = 'core.Application';

module.exports = Application;