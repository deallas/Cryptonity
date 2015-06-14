GLOBAL.IS_TEST = false;

require('./global.js');
var logger = require(APP_PATH + '/core/Logger.js');

GLOBAL.APP = new (require(APP_PATH + '/core/Application.js'))(
    'calc',  
    {
        'asyncEvents': {
            'preConfigure': function() {
                logger.info('Configuring...');
            },
            'preStart': function() {
                logger.info('Starting...');
            },
            'preStop': function() {
                logger.info('Stopping...');
            }
        },
        'syncEvents': {
            'postStop': function() {
                process.exit(0);
            }
        }
    }
);

process.once('SIGINT', function() {
    APP.stop();
});
process.once("SIGTERM", function() {
    APP.stop();
});
process.on("SIGUSR2", function() {
    APP.restart();
});

APP.configure(function() {
    APP.start();
});