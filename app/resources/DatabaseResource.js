var Sequelize = require('sequelize'),
    AbstractResource = require(CORE_PATH + '/AbstractResource.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    util = require('util');

var DatabaseResource = function(options) {
    DatabaseResource.super_.call(this, options);

    /* ---------------------------------------------------------------------- */

    var _schema = null,
        _models = {};

    /* ---------------------------------------------------------------------- */

    this.configure = function(_next) 
    {
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            _schema = new Sequelize(this.options.database, this.options.username, this.options.password, {
                dialect:    'mysql',
                host:       this.options.host,
                port:       this.options.port,
                native:     true,
                logging:    this.options.logging,
                maxConcurrentQueries: this.options.maxConcurrentQueries,
                define: {
                    freezeTableName:    true,
                    charset:            'utf8',
                    collate:            'utf8_general_ci',
                    timestamps:         true
                },
                pool: { 
                    maxConnections:     this.options.maxConnections, 
                    maxIdleTime:        this.options.maxIdleTime
                }
            });

            _schema
                .authenticate()
                .complete(function(err) {
                    if (!!err) {
                        logger.error('Unable to connect to the database: ' + err, this);
                        process.exit();
                    } else {
                        _models = require(this.options.schema);
                        _eventNext();
                    }
                }.bind(this));
        }.bind(this), _next);
    };

    /* ---------------------------------------------------------------------- */

    this.getSchema = function() { return _schema; };

    this.getModel = function(modelName) 
    {
        if(_.isUndefined(modelName)) {
            throw new Error('Model name has been not specified');
        }

        if(_.isUndefined(_models[modelName])) {
            throw new Error('Model "' + modelName + '" does not exists');
        }

        return _models[modelName];
    };

    this.getModels = function()
    {
        return _models;
    };
};

util.inherits(DatabaseResource, AbstractResource); 
DatabaseResource.prototype.className = 'resources.Database';
DatabaseResource.prototype.dependencies = [];

module.exports = DatabaseResource;