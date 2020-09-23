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
// var extend = require('extend');

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;
    UUIDGen = homebridge.hap.uuid;

    class JeeLinkAccessory extends Accessory {

        constructor( platform, deviceID, type, model) {
    
            var name = platform.getName(deviceID);
    
            if ( !name && !platform.options.scanmode ) {
                platorm.log.error( "Will not create device, since it is yet unknown and scanmode is off: " + id );
                return null
            }

            name = name || model + "_" + deviceID;
            var model = name.split("_", 2)[0];
    
            // fix duplicate UUID (https://github.com/andig/homebridge-fritz/issues/27)
            var uuid_base = type + deviceID;
            var uuid = UUIDGen.generate(uuid_base + name);
    
            super( name, uuid );
    
            // init data container
            this.uuid_base = uuid_base;
            this.context = {
                deviceID:   deviceID,
                type:       type,
                model:      model,
                data:       {}
            };
    
            this
            .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "LaCrosse")
            .setCharacteristic(Characteristic.Model, "LaCrosse")
            .setCharacteristic(Characteristic.SerialNumber, deviceID)
            ;
        };
        
        getServices = function() {
            return Object.keys(this.services).map(function(key) {
                return this.services[key];
            }.bind(this));
        };
    };
    
    return JeeLinkAccessory;
};
