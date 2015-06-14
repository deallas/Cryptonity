GLOBAL.IS_TEST = true;

require('../global.js');
var logger = require(CORE_PATH + '/Logger.js');

GLOBAL.APP = new (require(CORE_PATH + '/Application.js'))(
    'testBufRemoteEvent',
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

APP.configure(function() {
    APP.start();
});