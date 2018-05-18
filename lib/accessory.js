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

function JeeLinkAccessory( platform, deviceID, type) {

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
};

JeeLinkAccessory.prototype.getServices = function() {
    return Object.keys(this.services).map(function(key) {
        return this.services[key];
    }.bind(this));
};
