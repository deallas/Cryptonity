var Options = function(options, appendOnly) 
{    
    this.options = {};
    
    this.appendOptions = function(options) {
        this.options = _.extend(this.options, options);
    };

    this.clearOptions = function() {
        this.options = {}; 
    };

    this.setOptions = function(options) {
        this.options = _.clone(options);
    }
    
    if(_.isObject(options)) {
        appendOnly = !!appendOnly;
        
        if(appendOnly) {
            this.appendOptions(options);
        } else {
            this.setOptions(options);
        }
    }
}

module.exports = Options;