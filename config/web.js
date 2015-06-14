module.exports = {
    "resources": {
        "checkInstall": {
            'installFile': ROOT_PATH + '/.installed'
        },
        "database": require(__dirname + '/_database.js'),
        "bufRemoteEvent": {
            'maxSubscribers' :      10,
            'maxSegmentTime' :      60*60*1000, // 1h - miliseconds
            'maxSegmentLifetime' :  60*60*24*7, // week - seconds
            'maxSegmentElements' :  100
        },
        "web": {
            'ipAddress': '127.0.0.1',
            'port': APP_ENV === 'production' ? 80 : 3000,
            'publicPath': PUBLIC_PATH,
            'dumpExceptions': APP_ENV !== 'production',
            'showStack': APP_ENV !== 'production'
        }
    },
    "plugins": require(__dirname + '/_web.plugins.js')
};