
var LaCrosseDTH, LaCrosseBMP180, emonTH, emonWater;

module.exports = function(homebridge) {
    LaCrosseDTH    = require('./jeelink/LaCrosseDTH.js')(homebridge);
    LaCrosseBMP180 = require('./jeelink/LaCrosseDTH.js')(homebridge);
    emonTH         = require('./jeelink/LaCrosseDTH.js')(homebridge);
    emonWater      = require('./jeelink/LaCrosseDTH.js')(homebridge);

    return JeeLinkParser;
};

function JeeLinkParser( log, platform ) {
    this.log = log;
    this.logLaCrosseDTH = new LaCrosseDTH( log, platform );
    this.logLaCrosseBMP180 = new LaCrosseBMP180( log, platform );
    this.logemonTH = new emonTH( log, platform );
    this.logemonWater = new emonWater( log, platform );
};

JeeLinkParser.prototype = {
    parseValue: function( data ) {
        var tmp = data.split(' ');
        if(tmp[0]==='OK'){
            if (tmp[1]=== '9'){ // 9 ist fix für LaCrosse
               this.logLaCrosseDTH.parseValue(data);
            }
            else if (tmp[1]=== 'WS'){ //derzeitig fix für superjee
               this.logLaCrosseBMP180.parseValue(data);
            }
            else {  // es wird auf beide log der Datenstrom geschickt und dann ausgewertet
                    this.logemonTH.parseValue(data);
                    this.logemonWater.parseValue(data);
            }
        }
    }
};