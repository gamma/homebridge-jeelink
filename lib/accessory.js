/**
 * JeeLink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
 *
 * @url https://github.com/gamma/homebridge-jeelink
 * @author Gerry Weißbach
 * @license MIT
 */

/* jslint node: true, laxcomma: true, esversion: 6 */
"use strict";

var inherits = require('util').inherits;
var extend = require('extend');

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;
    UUIDGen = homebridge.hap.uuid;

    inherits(JeeLinkAccessory, Accessory);

    return JeeLinkAccessory;
};

function JeeLinkAccessory(platform, deviceID, type) {

    this.log = platform.log;
    this.name = platform.getName(deviceID) || "unknown";

    // fix duplicate UUID (https://github.com/andig/homebridge-fritz/issues/27)
    this.uuid_base = type + deviceID;

    var uuid;
    uuid = UUIDGen.generate(this.uuid_base + this.name);
  
    Accessory.apply(this, [ this.name, uuid ]);

    // init data container
    this.context = {
        deviceID: deviceID,
        type: type,
        data: {}        
    };

    this.context.lastUpdate = Date.now();

    this
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "LaCrosse")
    .setCharacteristic(Characteristic.Model, "LaCrosse")
    .setCharacteristic(Characteristic.SerialNumber, deviceID)
    ;

    this.on('identify', function(paired, callback) {
        platform.log(accessory.displayName, "Identify!!!");
        callback();
    });
};

JeeLinkAccessory.prototype.getServices = function() {
    return Object.keys(this.services).map(function(key) {
        return this.services[key];
    }.bind(this));
};

JeeLinkAccessory.prototype.getCurrentDataValues = function(callback) {
    this.log.debug(`Getting ${this.context.deviceID} values`);
    this.log.debug( this.context );
    
    // characteristic CurrentTemperature is part of multiple services
    callback(null, this.context.data);
};
