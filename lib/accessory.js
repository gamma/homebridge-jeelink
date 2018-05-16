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

    var name = platform.getName(deviceID) || "unknown";

    // fix duplicate UUID (https://github.com/andig/homebridge-fritz/issues/27)
    this.uuid_base = type + deviceID;

    var uuid;
    uuid = UUIDGen.generate(this.uuid_base + name);
  
    Accessory.apply(this, [ name, uuid ]);

    // init data container
    this.context = {
        deviceID: deviceID,
        type: type,
        data: {}        
    };

    this
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "LaCrosse")
    .setCharacteristic(Characteristic.Model, "LaCrosse")
    .setCharacteristic(Characteristic.SerialNumber, deviceID)
    ;

    this.configure( platform );
};

JeeLinkAccessory.prototype.configure = function(platform) {

    this.log = platform.log;
    this.context.lastUpdate = Date.now();

    var device = this;
    this.on('identify', function(paired, callback) {
        device.log(device.displayName, "Identify!!!");
        callback();
    });

    if ( ! this.getServices ) { this.getCurrentDataValues = JeeLinkAccessory.prototype.getServices; }
    if ( ! this.getCurrentDataValues ) { this.getCurrentDataValues = JeeLinkAccessory.prototype.getCurrentDataValues; }
};

JeeLinkAccessory.prototype.getServices = function() {
    return Object.keys(this.services).map(function(key) {
        return this.services[key];
    }.bind(this));
};

JeeLinkAccessory.prototype.getCurrentDataValues = function(callback) {

    this.log.debug("Getting values for:", this.context.deviceID, this.displayName);
    
    // characteristic CurrentTemperature is part of multiple services
    try { callback(null, this.context.data); } catch(e) { this.log.error( e.message ); }
};
