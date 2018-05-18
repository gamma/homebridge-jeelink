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

var Service, Homebridge, Characteristic, JeeLinkAccessory, FakeGatoHistoryService;

var inherits    = require('util').inherits;
var extend      = require('extend');

module.exports = function( homebridge ) {
    Homebridge = homebridge;
    Characteristic = homebridge.hap.Characteristic;
    Service = homebridge.hap.Service;

    JeeLinkAccessory = require('../accessory')(homebridge);
    FakeGatoHistoryService = require("fakegato-history")(homebridge);

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
        var tmp = data.toString().split(' ');

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
            this.log.info( "Creating new LaCrosse device: " + id );

            device = new LaCrosseDTHSensor( this.platform, new JeeLinkAccessory( this.platform, id, this.type ) );

            this.platform.addAccessory( device );
        } else {
            this.log.debug( "Device already existed: " + id );
        }

        return device.device;
    },

    configure: function( device ) {
        var returnDevice = new LaCrosseDTHSensor( this.platform, device );
        this.platform.log.info("Done configuring LaCrosse Sensor", returnDevice.device.displayName);
        return returnDevice
    }
};

function LaCrosseDTHSensor( platform, device ) {

    this.device = device;

    this.log = platform.log;

    var self = this;
    device.context.lastUpdate = Date.now();

    device.on('identify', function(paired, callback) {
        self.log(device.displayName, "Identify!!!");
        callback();
    });

    // Add Temperature
    (device.getService(Service.TemperatureSensor) || device.addService(Service.TemperatureSensor, device.displayName))
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({minValue: -50})
    .on('get', this.getCurrentDataValues.bind(this))
    ;

    // Add Humidity
    (device.getService(Service.HumiditySensor) || device.addService(Service.HumiditySensor, device.displayName))
    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .on('get', this.getCurrentDataValues.bind(this))
    ;

    // Remove an existing service, the logger has to be updated in full.
    if ( device.getService(FakeGatoHistoryService) ) {
        device.removeService(device.getService(FakeGatoHistoryService));
    }

    this.fakeGatoHistoryService = new FakeGatoHistoryService("weather", device, {
        storage: 'fs'
    });

    setInterval(this.update.bind(this), platform.interval);

};

LaCrosseDTHSensor.prototype.update = function() {
    this.log.debug("Updating:", this.device.context.type, this.device.context.deviceID);

    var self = this;
    this.getCurrentDataValues(function(foo, data) {
        // TemperatureSensor
        this.device
        .getService(Service.TemperatureSensor)
        .setCharacteristic(Characteristic.CurrentTemperature, data.temperature || 0)
        .setCharacteristic(Characteristic.StatusLowBattery, data.lowBat)
        ;

        // Humidity Sensor
        this.device
        .getService(Service.HumiditySensor)
        .setCharacteristic(Characteristic.CurrentRelativeHumidity, data.humidity || 0)
        .setCharacteristic(Characteristic.StatusLowBattery, data.lowBat)
        ;

        // Update history service
        this.fakeGatoHistoryService
        .addEntry({
            time: new Date().getTime() / 1000,
            temp: data.temperature || 0,
            humidity: data.humidity || 0
        });

    }.bind(this));
};

LaCrosseDTHSensor.prototype.getCurrentDataValues = function(callback) {

    var context = this.device.context;
    this.log.info("Getting values for", context.deviceID, this.device.displayName, "Temperature:", context.data.temperature, "Humidity:", context.data.humidity );
    
    // characteristic CurrentTemperature is part of multiple services
    try { callback(null, context.data); } catch(e) { this.log.error( e.message ); }
};
