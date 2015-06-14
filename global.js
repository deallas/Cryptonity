GLOBAL._ = require('underscore');

GLOBAL.ROOT_PATH = __dirname;
GLOBAL.APP_PATH = ROOT_PATH + '/app';
GLOBAL.CONFIG_PATH = ROOT_PATH + '/config';
GLOBAL.DATA_PATH = ROOT_PATH + '/data';
GLOBAL.LOG_PATH = ROOT_PATH + '/log';
GLOBAL.PUBLIC_PATH = ROOT_PATH + '/public';

GLOBAL.CORE_PATH = APP_PATH + '/core';
GLOBAL.PLUGINS_PATH = APP_PATH + '/plugins';
GLOBAL.RESOURCES_PATH = APP_PATH + '/resources';
GLOBAL.SERVICES_PATH = APP_PATH + '/services';

GLOBAL.GLOBAL_FILE = __filename;
GLOBAL.APP_ENV = (process.env.APP_ENV) ? process.env.APP_ENV : 'development';

GLOBAL.TEST_PATH = ROOT_PATH + '/test';
if(IS_TEST) {
    CONFIG_PATH = TEST_PATH + '/config';
    DATA_PATH = TEST_PATH + '/data';
    LOG_PATH = TEST_PATH + '/log';
    PUBLIC_PATH = TEST_PATH + '/public';
    PLUGINS_PATH += ':' + TEST_PATH + '/app/plugins';
    RESOURCES_PATH += ':' + TEST_PATH + '/app/resources';
    SERVICES_PATH += ':' + TEST_PATH + '/app/services';
    APP_ENV = 'testing';
}