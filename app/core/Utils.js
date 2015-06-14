var logger = require(CORE_PATH + '/Logger.js'),
    fs = require('fs'),
    async = require('async');
    
module.exports = {
    
    getModules : function(_dir, _regexp, _callback) {
        var dirs = _dir.split(':');
        async.concat(
            dirs,
            this._getModulesHelper(_regexp),
            function(err, _results) {
                if(err) {
                    throw new Error(err);
                }
                var results = {}
                _.each(_results, function(res) {
                    results[res.name] = res.file;
                });

                _callback(results);
            }
        );
    },

    loadConfig: function(filename, callback)
    {
        var format = filename.substr(filename.lastIndexOf('.') + 1);
        
        fs.exists(filename, function(exists) {
            if(exists) {
                switch (format) {
                    case 'js':
                        callback(null, require(filename));
                        break;
                    case 'json':
                        fs.readFile(filename, { 'encoding': 'utf8' }, function(err, data) {
                            if(err) {
                                callback(err, null);
                            } else {
                                callback(null, JSON.parse(data));
                            }
                        });
                        break;
                    default:
                        callback('Unsupported config format "' + format + '"', null);
                }
            } else {
                callback('File "' + filename + '" not exists', null);
            }
        });
    },
    
    saveConfig: function(filename, data, callback)
    {
        var format = filename.substr(filename.lastIndexOf('.') + 1);
        
        switch(format) {
            case 'json':
                fs.writeFile(filename, JSON.stringify(data, null, 4), { 'encoding': 'utf8' }, function(err) {
                    callback();
                }); 
                break;
            default:
                callback('Unsupported config format "' + format + '"');
        }
    },

    implements : function(baseObj, impClasses)
    {
        if(!_.isArray(impClasses)) {
            impClasses = [ impClasses ];
        }

        _.each(impClasses, function(impClass) {
            var impObj = new impClass(),
                preImplement = false,
                postImplement = false;
           
            if(_.isFunction(impObj.preImplement)) {
                preImplement = impObj.preImplement;
                delete impObj.preImplement;
            }
            if(_.isFunction(impObj.postImplement)) {
                postImplement = impObj.postImplement;
                delete impObj.postImplement;
            }
           
            if(preImplement) {
                preImplement(baseObj);
            }
            
            baseObj = _.extend(baseObj, impObj);
            
            if(postImplement) {
                postImplement(baseObj);
            }
        });
    },

    isImplemented : function(obj, className)
    {
        if (!_.isObject(obj) || (!_.isFunction(className) && !_.isObject(className))) {
            throw new Error('Invalid type/s, expected (object, [object|class])');
        }
        
        if(_.isFunction(className)) {
            className = new className();
        }

        var objMethods = this._getMethods(obj),
            classMethods = this._getMethods(className),
            found = true;

        _.each(classMethods, function(method) {
            found = false;
            _.each(objMethods, function(objMethod) {
                if (method === objMethod) {
                    found = true;
                    return false;
                }
            });
            if (!found) {
                return false;
            }
        });

        return found;
    },

    /* ---------------------------------------------------------------------- */

    _getMethods : function(obj)
    {
        var res = [];
        for (var m in obj) {
            if(_.isFunction(obj[m])) {
                res.push(m)
            }
        }
        return res;
    },

    _getModulesHelper : function(regexp)
    {
        var self = this;
        return function(_dir, _callback) {
            var results = [];
            fs.readdir(_dir, function(err, list) {
                if (err) {
                    return _callback(err);
                }
                var pending = list.length;
                if (!pending) {
                    return _callback(null, results);
                }
                list.forEach(function(file) {
                    var filePath = _dir + '/' + file;
                    fs.stat(filePath, function(err, stat) {
                        if (stat && stat.isDirectory()) {
                            self._getModulesHelper(regexp)(filePath, function(err, res) {
                                if(!_.isUndefined(res)) {
                                    results = results.concat(res);
                                }
                                if(!--pending) {
                                    _callback(null, results);
                                }
                            });
                        } else {
                            var regexpResult = file.match(regexp);
                            if (regexpResult) {
                                var module = require(filePath),
                                    moduleName;
                            
                                if(module.prototype.className) {
                                    moduleName = module.prototype.className;
                                } else {
                                    throw new Error('File "' + filePath + '" has not "className" property');
                                }
                                
                                results.push({'file': filePath, 'name': moduleName});
                            }
                            if (!--pending) {
                                _callback(null, results);
                            }
                        }
                    });
                });
            });
        }
    }
};