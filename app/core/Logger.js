var winston = require('winston');

var transports = [new winston.transports.File({ level: 'info', filename: LOG_PATH + '/debug.log', json: false })];
var exceptionHandlers = [new winston.transports.File({ filename: LOG_PATH + '/exceptions.log', json: false })];

if(APP_ENV === 'development' || APP_ENV === 'testing') {
    transports.push(new (winston.transports.Console)({ level: 'debug', json: false, timestamp: true, colorize: true }));
    exceptionHandlers.push(new (winston.transports.Console)({ json: false, timestamp: true, colorize: true }));
}

var customColors = {
    debug: 'green',
    info: 'white',
    warn: 'yellow',
    crit: 'red'
};

var logger = new (winston.Logger)({
    colors: customColors,
    levels: {
        debug:  0,
        info:   1,
        warn:   2,
        error:  4
    },
    transports: transports,
    exceptionHandlers: exceptionHandlers,
    exitOnError: false
});

winston.addColors(customColors);

var origLog = logger.log;

var logLevelFunc = function(level) {
    return function(msg, object) {
        var objType = Object.prototype.toString.call(msg);
        if (objType === '[object Error]') {
            msg = msg.toString();
        }

        origLog.call(logger, level, (_.isObject(object) && object.className ? '[ ' + object.className + '] ' : '') + msg);
    }
};
_.each(_.keys(customColors), function(level) {
    logger[level] = logLevelFunc(level);
});

logger.log = function (level, msg, object) {
    var objType = Object.prototype.toString.call(msg);
    if (objType === '[object Error]') {
        msg = msg.toString();
    }
    origLog.call(logger, level, (_.isObject(object) && object.className ? '[ ' + object.className + '] ' : '') + msg);
};

module.exports = logger;