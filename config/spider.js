module.exports = {
    "resources": {
        "checkInstall": {
            'installFile': ROOT_PATH + '/.installed'
        },
        "bufRemoteEvent": {
            'maxSubscribers' :      10,
            'maxSegmentTime' :      60*60*1000, // 1h - miliseconds
            'maxSegmentLifetime' :  60*60*24*7, // week - seconds
            'maxSegmentElements' :  100
        }
    },
    "plugins": require(__dirname + '/_spider.plugins.js')
};