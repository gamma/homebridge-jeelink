/**
 * jeelink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
 *
 * @url https://github.com/gamma/homebridge-jeelink
 * @author Gerry Weißbach
 * @license MIT
 */

/* jslint node: true, laxcomma: true, esversion: 6 */
"use strict";

var LaCrosseDTH, LaCrosseBMP180, emonTH, emonWater;

module.exports = function(homebridge) {
    LaCrosseDTH    = require('./jeelink/LaCrosseDTH.js')(homebridge);
    LaCrosseBMP180 = require('./jeelink/LaCrosseDTH.js')(homebridge);
    emonTH         = require('./jeelink/LaCrosseDTH.js')(homebridge);
    emonWater      = require('./jeelink/LaCrosseDTH.js')(homebridge);

    return JeeLinkParser;
};

function JeeLinkParser( platform ) {
    this.logLaCrosseDTH = new LaCrosseDTH( platform );
    this.logLaCrosseBMP180 = new LaCrosseBMP180( platform );
    this.logemonTH = new emonTH( platform );
    this.logemonWater = new emonWater( platform );
    this.log = platform.log;
    

/*
    // Some Tests!!!
    this.logLaCrosseDTH.parseValue('OK 9 56 1 4 156 37');
//*/
};

JeeLinkParser.prototype = {
    parseValue: function( data ) {
    	this.log.debug("received:", data.toString());
        var tmp = data.toString().split(' ');
        if(tmp[0]==='OK'){
            if (tmp[1]=== '9'){ // 9 ist fix für LaCrosse
                this.logLaCrosseDTH.parseValue(data);
            }
            else if (tmp[1]=== 'WS'){ //derzeitig fix für superjee
//*
                this.log.error('WS is not yet implemented!');
                return; // not yet implemented
/*/
                this.logLaCrosseBMP180.parseValue(data);
//*/
            }
            else {  // es wird auf beide log der Datenstrom geschickt und dann ausgewertet
//*
                this.log.error('EMON is not yet implemented!');
                return; // not yet implemented
/*/
                this.logemonTH.parseValue(data);
                this.logemonWater.parseValue(data);
//*/
            }
        }
    },
    configure: function( device ) {
        switch( device.context.type ) {
            case this.logLaCrosseDTH.type:
                return this.logLaCrosseDTH.configure( device );
                break;
            case this.logLaCrosseBMP180.type:
                return this.logLaCrosseBMP180.configure( device );
                break;
            default:
                return this.logemonTH.configure( device ) || this.logemonWater.configure( device );
        }
    },
    test: function() {
        // Some Tests!!!
        // this.logLaCrosseDTH.parseValue('OK 9 56 1 4 156 37');
        this.logLaCrosseDTH.parseValue('OK 9 28 1 4 156 37');
    },
};