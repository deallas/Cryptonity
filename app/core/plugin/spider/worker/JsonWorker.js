var AbstractWorker = require(APP_PATH + '/core/plugin/spider/AbstractWorker.js'),
    logger = require(CORE_PATH + '/Logger.js'),
    CronJob = require('cron').CronJob,
    https = require('https'),
    zlib = require('zlib');

var JsonWorker = function(options) {
    JsonWorker.super_.call(this, options);

    var _defaultOptions = {
        'cronTime': "*/5 * * * * *",
        'timeZone': 'Europe/London',
        'requestParams' : {
            host: null,
            port: 80,
            path: '/',
            method: 'GET',
            rejectUnauthorized: false,
            headers: { 'accept-encoding': 'gzip,deflate' }
        }
    };
    this.options = _.extend(_defaultOptions, this.options);

    /* ---------------------------------------------------------------------- */
    
    var _job = null;
    
    /* ---------------------------------------------------------------------- */
    
    this.configure = function(_next) 
    {
        _next = _next || function() {};
        this.executeEvent('configure', function(_eventNext) {
            _job = new CronJob({
                cronTime: this.options.cronTime,
                start: false,
                timeZone: this.options.timeZone,
                onTick: function() {
                    if(_.isUndefined(this.options.requestParams.headers)) {
                        this.options.requestParams.headers = {}
                    }
                    this.options.requestParams.headers['user-agent'] = 'Cryptonity Spider';

                    var req = https.request(this.options.requestParams, function(result) {
                        var responseParts = [];

                        result.on('data', function (chunk) {
                            responseParts.push(new Buffer(chunk));
                        });

                        result.on("end", function() {
                            var rawBuffer = Buffer.concat(responseParts);
                            switch (result.headers['content-encoding']) {
                            case 'gzip':
                                zlib.gunzip(rawBuffer, function(err, buffer) {
                                    if (!err) {
                                        var data;
                                        try {
                                            data = JSON.parse(buffer.toString())
                                        } catch(err) {
                                            logger.warn(err, this);
                                            return;
                                        }
                                        this.options.collect(data);
                                    } else {
                                        logger.warn(err, this);
                                    }
                                }.bind(this));
                                break;
                            case 'deflate':
                                zlib.inflate(rawBuffer, function(err, buffer) {
                                    if (!err) {
                                        var data;
                                        try {
                                            data = JSON.parse(buffer.toString())
                                        } catch(err) {
                                            logger.warn(err, this);
                                            return;
                                        }
                                        this.options.collect(data);
                                    } else {
                                        logger.warn(err, this);
                                    }
                                }.bind(this));
                                break;
                            default:
                                var data;
                                try {
                                    data = JSON.parse(rawBuffer.toString())
                                } catch(err) {
                                    logger.warn(err, this);
                                    return;
                                }
                                this.options.collect(data);
                            }
                        }.bind(this));
                    }.bind(this));
                    req.end();
                    req.on('error', function(err) {
                        logger.warn(err, this);
                    }.bind(this));  
                }.bind(this)
            });
            
            _eventNext();
        }.bind(this), _next);
    };
    
    this.start = function(_next)
    { 
        _next = _next || function() {};
        this.executeEvent('start', function(_eventNext) {
            _job.start();
            _eventNext();
        }.bind(this), _next);
    };
    
    this.stop = function(_next)
    { 
        _next = _next || function() {};
        this.executeEvent('stop', function(_eventNext) {
            _job.stop();
            _eventNext();
        }.bind(this), _next);
    };
}

util.inherits(JsonWorker, AbstractWorker);
JsonWorker.prototype.className = 'core.plugin.spider.worker.Json';

module.exports = JsonWorker;