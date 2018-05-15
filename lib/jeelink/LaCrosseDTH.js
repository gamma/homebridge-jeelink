/**
 * jeelink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
 *
 * Based up on the protocol implementation by: @foxthefox
 * https://github.com/foxthefox/ioBroker.jeelink
 * 
 * @url https://github.com/gamma/homebridge-jeelink
 * @author Gerry Weißbach
 * @license MIT
 */

/* jslint node: true, laxcomma: true, esversion: 6 */
"use strict";

// OK 9 56 1   4   156 37   ID = 56 T: 18.0 H: 37 no NewBatt
// OK 9 49 1   4   182 54   ID = 49 T: 20.6 H: 54 no NewBatt
// OK 9 55 129 4   192 56   ID = 55 T: 21.6 H: 56 WITH NewBatt
// OK 9 ID XXX XXX XXX XXX
// |  | |  |   |   |   |
// |  | |  |   |   |   |-- [6]Humidity incl. WeakBatteryFlag
// |  | |  |   |   |------ [5]Temp * 10 + 1000 LSB
// |  | |  |   |---------- [4]Temp * 10 + 1000 MSB
// |  | |  |-------------- [3]Sensor type (1 or 2) +128 if NewBatteryFlag
// |  | |----------------- [2]Sensor ID
// |  |------------------- [1]fix "9"
// |---------------------- [0]fix "OK"

var Service, Homebridge, Characteristic, JeeLinkAccessory;

var inherits    = require('util').inherits;
var extend      = require('extend');

module.exports = function( homebridge ) {
    Homebridge = homebridge;
    Characteristic = homebridge.hap.Characteristic;
    Service = homebridge.hap.Service;

    JeeLinkAccessory = require('../accessory')(homebridge);

    inherits(LaCrosseDTHSensor, JeeLinkAccessory);

    return LaCrosseDTH;
}

function LaCrosseDTH( platform ) {
    this.platform   = platform;
    this.log        = platform.log;
    this.type       = "LaCrosse Temperature Sensor";
};

function round(value, digits) //digits 1 for 1 digit after comma
{
    var factor = Math.pow(10, digits);
    value = Math.round(value*factor);
    return value/factor;
};

LaCrosseDTH.prototype = {
    parseValue: function( data ) {
        var tmp = data.split(' ');

        if(tmp[0]!=='OK') { return; }

        // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]!=='9') { return; }

        // Protocol is reuired.
        if(tmp.length != 7 ) { return; }

        // Für jeden Datensatz mit dem fixen Eintrag 9
        var tmpp = tmp.splice(2,6);       // es werden die vorderen Blöcke (0,1,2) entfernt
        this.log.debug('splice       : '+ tmpp);
        var buf = new Buffer.from(tmpp);

         //absolute Feuchte und Taupunkt
        var temp = ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10);
        var rel = (buf.readIntLE(4) & 0x7f);
        var vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
        var v = Math.log(vappress/6.1078) * Math.LOG10E;
        var dewp = (237.3 * v) / (7.5 - v);
        var habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );

        var data = {
            id:             (buf.readIntLE(0)),
            type:           ((buf.readIntLE(1) & 0x70) >> 4),
            newBat:         ((buf.readIntLE(1) & 0x80) >> 7),       // wenn "100000xx" dann NewBatt # xx = SensorType 1 oder 2
            lowBat:         ((buf.readIntLE(4) & 0x80) >> 7),       // Hier muss noch "incl. WeakBatteryFlag" ausgewertet 
            temperature:    temp,
            humidity:       (buf.readIntLE(4) & 0x7f),

            absHumidity:    round(habs, 1),
            dewPoint:       round(dewp, 1)
        };

        this.log.debug('Sensor ID    : ' + data.id );
        this.log.debug('Type         : ' + data.type );
        this.log.debug('NewBattery   : ' + data.newBat );
        this.log.debug('Temperatur   : ' + data.temperature );
        this.log.debug('Humidty      : ' + data.humidity );
        this.log.debug('LowBattery   : ' + data.lowBat );
        this.log.debug('AbsHumid     : ' + data.absHumidity );
        this.log.debug('DewPoint     : ' + data.dewPoint );

        var device = this.getOrCreateDevice( data.id );
        device.context.data = data;
        device.context.lastUpdate = Date.now();
    },

    getOrCreateDevice: function( id ) {

        id = "LaCrosse_" + id;
        var device = this.platform.getDevice( id );
        
        if ( device === null ) {
            device = new LaCrosseDTHSensor( this.platform, id, this.type );
            this.log.debug( "Created new LaCrosse device: " + id );
            this.platform.addAccessory( device );
        } else {
            this.log.debug( "Device already existed: " + id );
        }

        return device;
    },

    configure: function( device ) {
        var newDevice = new LaCrosseDTHSensor(this.platform, device.context.data.id, this.type);
        newDevice.context.data = device.context.data;
        newDevice.context.lastUpdate = Date.now();
        return newDevice;
    }
};

function LaCrosseDTHSensor(platform, deviceID, type ) {
    JeeLinkAccessory.apply(this, Array.from(arguments));

    setInterval(this.update.bind(this), platform.interval);
//    setInterval(this.update.bind(this), 5000);

    // Add Temperature
    this.addService(Service.TemperatureSensor, this.name)
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({minValue: -50})
    .on('get', this.getCurrentDataValues.bind(this))
    ;

    // Add Humidity
    this.addService(Service.HumiditySensor, this.name)
    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .on('get', this.getCurrentDataValues.bind(this))
    ;
}

LaCrosseDTHSensor.prototype.update = function() {
    this.log.debug(`Updating ${this.context.type} ${this.context.deviceID}`);

    this.getCurrentDataValues(function(foo, data) {
        // TemperatureSensor
        this.log.debug( "update current Temperature: " + data.temperature  );
        this
        .getService(Service.TemperatureSensor)
        .setCharacteristic(Characteristic.CurrentTemperature, data.temperature)
        .setCharacteristic(Characteristic.StatusLowBattery, data.lowBat)
        ;

        // Humidity Sensor
        this.log.debug( "update current Humidity: " + data.humidity  );
        this
        .getService(Service.HumiditySensor)
        .setCharacteristic(Characteristic.CurrentRelativeHumidity, data.humidity)
        .setCharacteristic(Characteristic.StatusLowBattery, data.lowBat)
        ;
    }.bind(this));
};
